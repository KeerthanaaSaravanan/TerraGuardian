package ai.terraguardian.safe.data

import android.content.Context
import android.content.SharedPreferences
import ai.terraguardian.safe.model.*
import ai.terraguardian.safe.network.TerraGuardianApiClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class SafetyRepository(
    private val context: Context,
    private val apiClient: TerraGuardianApiClient = TerraGuardianApiClient()
) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("tg_safety_prefs", Context.MODE_PRIVATE)

    fun getDeviceId(): String {
        var id = prefs.getString("device_id", null)
        if (id == null) {
            id = "android-" + java.util.UUID.randomUUID().toString().substring(0, 8)
            prefs.edit().putString("device_id", id).apply()
        }
        return id
    }

    suspend fun getSafetyStatus(
        lat: Double,
        lng: Double,
        district: String = "West Kameng"
    ): CitizenSafetyStatus = withContext(Dispatchers.IO) {
        try {
            val fresh = apiClient.getSafetyStatus(lat, lng, district)
            saveCache(fresh)
            fresh
        } catch (e: Exception) {
            // Read from cache
            val cached = loadCache(lat, lng, district)
            cached ?: CitizenSafetyStatus(
                safetyStatus = WarningLevel.NORMAL,
                statusHeadline = "🟢 NO ACTIVE HAZARDS (OFFLINE)",
                latitude = lat,
                longitude = lng,
                district = district,
                activeWarning = null,
                whatChanged = listOf("Operating offline. Local safety cache active."),
                recommendedActions = listOf("Proceed with standard hillside transit caution."),
                affectedRoads = emptyList(),
                isCachedStale = true,
                lastUpdated = "Offline"
            )
        }
    }

    suspend fun acknowledgeAlert(
        alertId: String,
        isSafe: Boolean,
        notes: String? = null
    ): Boolean = withContext(Dispatchers.IO) {
        val deviceId = getDeviceId()
        try {
            apiClient.acknowledgeAlert(alertId, deviceId, isSafe, notes)
        } catch (e: Exception) {
            // Mark acknowledged locally
            prefs.edit().putBoolean("ack_$alertId", true).apply()
            true
        }
    }

    suspend fun registerDevice(lat: Double?, lng: Double?, district: String?) {
        withContext(Dispatchers.IO) {
            try {
                val deviceId = getDeviceId()
                val token = "fcm-native-" + deviceId
                apiClient.registerDevice(deviceId, token, lat, lng, district)
            } catch (e: Exception) {
                // Silently handle offline registration
            }
        }
    }

    private fun saveCache(status: CitizenSafetyStatus) {
        val json = JSONObject().apply {
            put("safety_status", status.safetyStatus.name)
            put("status_headline", status.statusHeadline)
            put("last_updated", System.currentTimeMillis().toString())
            put("what_changed", JSONArray(status.whatChanged))
            put("recommended_actions", JSONArray(status.recommendedActions))
        }
        prefs.edit().putString("cached_safety_json", json.toString()).apply()
    }

    private fun loadCache(lat: Double, lng: Double, district: String): CitizenSafetyStatus? {
        val jsonStr = prefs.getString("cached_safety_json", null) ?: return null
        return try {
            val json = JSONObject(jsonStr)
            val level = WarningLevel.valueOf(json.optString("safety_status", "NORMAL"))
            val wc = mutableListOf<String>()
            val wcArr = json.optJSONArray("what_changed")
            if (wcArr != null) {
                for (i in 0 until wcArr.length()) wc.add(wcArr.getString(i))
            }
            val act = mutableListOf<String>()
            val actArr = json.optJSONArray("recommended_actions")
            if (actArr != null) {
                for (i in 0 until actArr.length()) act.add(actArr.getString(i))
            }

            CitizenSafetyStatus(
                safetyStatus = level,
                statusHeadline = json.optString("status_headline") + " (CACHED)",
                latitude = lat,
                longitude = lng,
                district = district,
                activeWarning = null,
                whatChanged = wc,
                recommendedActions = act,
                affectedRoads = emptyList(),
                isCachedStale = true,
                lastUpdated = "Cached"
            )
        } catch (e: Exception) {
            null
        }
    }
}
