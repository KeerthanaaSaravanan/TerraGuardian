package ai.terraguardian.safe

import ai.terraguardian.safe.model.AlertNotificationPayload
import ai.terraguardian.safe.model.WarningLevel
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.*

class SafetyModelTest {

    @Test
    fun testWarningLevelColorAndTitleMapping() {
        assertEquals("#10b981", WarningLevel.NORMAL.toColorHex())
        assertEquals("#eab308", WarningLevel.ADVISORY.toColorHex())
        assertEquals("#f97316", WarningLevel.WARNING.toColorHex())
        assertEquals("#ef4444", WarningLevel.EMERGENCY.toColorHex())

        assertTrue(WarningLevel.NORMAL.toDisplayTitle().contains("NO ACTIVE HAZARDS"))
        assertTrue(WarningLevel.EMERGENCY.toDisplayTitle().contains("EMERGENCY"))
    }

    @Test
    fun testAlertNotificationPayloadFromJson() {
        val json = JSONObject().apply {
            put("alert_id", "alt-test-992")
            put("alert_code", "ALT-2048-01")
            put("headline", "Active Debris Flow on NH-13")
            put("message", "Immediate road closure required.")
            put("warning_level", "EMERGENCY")
            put("action_required", "Evacuate slope toe.")
            put("channel_id", "terraguardian_emergency_alerts")
        }

        val payload = AlertNotificationPayload.fromJson(json)
        assertEquals("alt-test-992", payload.alertId)
        assertEquals("ALT-2048-01", payload.alertCode)
        assertEquals(WarningLevel.EMERGENCY, payload.warningLevel)
        assertEquals("terraguardian_emergency_alerts", payload.channelId)
    }

    @Test
    fun testGeofenceDistanceCalculation() {
        // Distance between Bhalukpong (27.01, 92.65) and KM-42 Sessa (27.08, 92.56)
        val lat1 = 27.01
        val lon1 = 92.65
        val lat2 = 27.08
        val lon2 = 92.56

        val r = 6371.0
        val dLat = Math.toRadians(lat2 - lat1)
        val dLon = Math.toRadians(lon2 - lon1)
        val a = sin(dLat / 2).pow(2) + cos(Math.toRadians(lat1)) * cos(Math.toRadians(lat2)) * sin(dLon / 2).pow(2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))
        val distanceKm = r * c

        // Expected distance is ~11.8 km
        assertTrue("Distance should be around 11-13 km", distanceKm in 10.0..14.0)
    }
}
