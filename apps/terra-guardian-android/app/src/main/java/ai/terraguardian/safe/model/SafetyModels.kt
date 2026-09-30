package ai.terraguardian.safe.model

import org.json.JSONObject

enum class WarningLevel {
    NORMAL,
    WATCH,
    ADVISORY,
    WARNING,
    SEVERE_WARNING,
    EMERGENCY;

    fun toColorHex(): String {
        return when (this) {
            NORMAL -> "#10b981"
            WATCH, ADVISORY -> "#eab308"
            WARNING, SEVERE_WARNING -> "#f97316"
            EMERGENCY -> "#ef4444"
        }
    }

    fun toDisplayTitle(): String {
        return when (this) {
            NORMAL -> "🟢 NO ACTIVE HAZARDS NEAR YOU"
            WATCH -> "MONSOON WATCH IN EFFECT"
            ADVISORY -> "🟡 LANDSLIDE ADVISORY ACTIVE"
            WARNING, SEVERE_WARNING -> "🟠 HIGH HAZARD LANDSLIDE WARNING"
            EMERGENCY -> "🔴 EMERGENCY WARNING: ACTIVE HAZARD"
        }
    }
}

data class ActiveWarning(
    val id: String,
    val alertCode: String,
    val severity: String,
    val warningLevel: WarningLevel,
    val headline: String,
    val targetArea: String,
    val message: String,
    val actionRequired: String,
    val rationale: String?,
    val authorityOrderCode: String?,
    val validUntil: String?
)

data class RoadStatus(
    val id: String,
    val roadCode: String,
    val roadName: String,
    val corridorSection: String,
    val status: String,
    val conditionSummary: String,
    val source: String
)

data class CitizenSafetyStatus(
    val safetyStatus: WarningLevel,
    val statusHeadline: String,
    val latitude: Double,
    val longitude: Double,
    val district: String,
    val activeWarning: ActiveWarning?,
    val whatChanged: List<String>,
    val recommendedActions: List<String>,
    val affectedRoads: List<RoadStatus>,
    val isCachedStale: Boolean = false,
    val lastUpdated: String = ""
)

data class AlertNotificationPayload(
    val alertId: String,
    val alertCode: String,
    val headline: String,
    val message: String,
    val warningLevel: WarningLevel,
    val actionRequired: String,
    val channelId: String
) {
    companion object {
        fun fromJson(json: JSONObject): AlertNotificationPayload {
            val levelStr = json.optString("warning_level", "WARNING").uppercase()
            val level = try {
                WarningLevel.valueOf(levelStr)
            } catch (e: Exception) {
                WarningLevel.WARNING
            }
            return AlertNotificationPayload(
                alertId = json.optString("alert_id", ""),
                alertCode = json.optString("alert_code", "LIVE-ALERT"),
                headline = json.optString("headline", "Hazard Warning"),
                message = json.optString("message", "High hazard conditions reported."),
                warningLevel = level,
                actionRequired = json.optString("action_required", "Follow emergency instructions."),
                channelId = json.optString("channel_id", "terraguardian_hazard_warnings")
            )
        }
    }
}
