package ai.terraguardian.safe.network

import ai.terraguardian.safe.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class TerraGuardianApiClient(private val baseUrl: String = "http://10.0.2.2:8000/api/v1") {

    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()

    private val jsonMediaType = "application/json; charset=utf-8".toMediaType()

    suspend fun getSafetyStatus(
        lat: Double,
        lng: Double,
        district: String = "West Kameng"
    ): CitizenSafetyStatus = withContext(Dispatchers.IO) {
        val url = "$baseUrl/citizen/safety-status?lat=$lat&lng=$lng&district=$district"
        val request = Request.Builder().url(url).get().build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw Exception("Failed to fetch safety status: ${response.code}")
            }
            val body = response.body?.string() ?: "{}"
            parseSafetyStatus(JSONObject(body), lat, lng, district)
        }
    }

    suspend fun acknowledgeAlert(
        alertId: String,
        deviceId: String,
        isSafe: Boolean,
        notes: String? = null
    ): Boolean = withContext(Dispatchers.IO) {
        val url = "$baseUrl/alerts/$alertId/acknowledge"
        val json = JSONObject().apply {
            put("device_id", deviceId)
            put("is_safe", isSafe)
            notes?.let { put("safe_notes", it) }
        }
        val request = Request.Builder()
            .url(url)
            .post(json.toString().toRequestBody(jsonMediaType))
            .build()

        client.newCall(request).execute().use { response ->
            response.isSuccessful
        }
    }

    suspend fun registerDevice(
        deviceId: String,
        fcmToken: String,
        lat: Double?,
        lng: Double?,
        district: String?
    ): Boolean = withContext(Dispatchers.IO) {
        val url = "$baseUrl/devices/register"
        val json = JSONObject().apply {
            put("device_id", deviceId)
            put("fcm_token", fcmToken)
            put("platform", "ANDROID")
            put("app_version", "1.0.0")
            put("notification_permissions", true)
            lat?.let { put("latitude", it) }
            lng?.let { put("longitude", it) }
            district?.let { put("subscribed_districts", JSONArray(listOf(it))) }
        }
        val request = Request.Builder()
            .url(url)
            .post(json.toString().toRequestBody(jsonMediaType))
            .build()

        client.newCall(request).execute().use { response ->
            response.isSuccessful
        }
    }

    private fun parseSafetyStatus(
        json: JSONObject,
        lat: Double,
        lng: Double,
        district: String
    ): CitizenSafetyStatus {
        val levelStr = json.optString("safety_status", "NORMAL").uppercase()
        val level = try {
            WarningLevel.valueOf(levelStr)
        } catch (e: Exception) {
            WarningLevel.NORMAL
        }

        var activeWarning: ActiveWarning? = null
        if (json.has("active_warning") && !json.isNull("active_warning")) {
            val aw = json.getJSONObject("active_warning")
            val wLevelStr = aw.optString("warning_level", "WARNING").uppercase()
            val wLevel = try {
                WarningLevel.valueOf(wLevelStr)
            } catch (e: Exception) {
                WarningLevel.WARNING
            }
            activeWarning = ActiveWarning(
                id = aw.optString("id", ""),
                alertCode = aw.optString("alert_code", "LIVE-ALERT"),
                severity = aw.optString("severity", "HIGH"),
                warningLevel = wLevel,
                headline = aw.optString("headline", "Hazard Warning"),
                targetArea = aw.optString("target_area", "West Kameng Corridor"),
                message = aw.optString("message", ""),
                actionRequired = aw.optString("action_required", "Follow emergency guidelines."),
                rationale = aw.optString("rationale", null),
                authorityOrderCode = aw.optString("authority_order_code", null),
                validUntil = aw.optString("valid_until", null)
            )
        }

        val whatChanged = mutableListOf<String>()
        val wcArr = json.optJSONArray("what_changed")
        if (wcArr != null) {
            for (i in 0 until wcArr.length()) {
                whatChanged.add(wcArr.getString(i))
            }
        }

        val actions = mutableListOf<String>()
        val actArr = json.optJSONArray("recommended_actions")
        if (actArr != null) {
            for (i in 0 until actArr.length()) {
                actions.add(actArr.getString(i))
            }
        }

        val roads = mutableListOf<RoadStatus>()
        val roadArr = json.optJSONArray("affected_roads")
        if (roadArr != null) {
            for (i in 0 until roadArr.length()) {
                val r = roadArr.getJSONObject(i)
                roads.add(
                    RoadStatus(
                        id = r.optString("id", ""),
                        roadCode = r.optString("road_code", "NH-13"),
                        roadName = r.optString("road_name", "Trans-Arunachal Highway"),
                        corridorSection = r.optString("corridor_section", "Sessa Corridor"),
                        status = r.optString("status", "OPEN"),
                        conditionSummary = r.optString("condition_summary", "Operational"),
                        source = r.optString("source", "BRO")
                    )
                )
            }
        }

        return CitizenSafetyStatus(
            safetyStatus = level,
            statusHeadline = json.optString("status_headline", "🟢 NO ACTIVE HAZARDS NEAR YOU"),
            latitude = lat,
            longitude = lng,
            district = district,
            activeWarning = activeWarning,
            whatChanged = whatChanged,
            recommendedActions = actions,
            affectedRoads = roads,
            isCachedStale = false,
            lastUpdated = json.optString("last_updated", "")
        )
    }
}
