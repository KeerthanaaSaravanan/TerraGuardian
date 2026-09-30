package ai.terraguardian.safe

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build

class TerraGuardianApp : Application() {

    override fun onCreate() {
        super.onCreate()
        createNotificationChannels()
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = getSystemService(NotificationManager::class.java)

            // 1. EMERGENCY Channel (High Importance, Sound, Vibration, Bypass DND)
            val emergencyChannel = NotificationChannel(
                CHANNEL_EMERGENCY,
                getString(R.string.channel_emergency_name),
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = getString(R.string.channel_emergency_desc)
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 500, 200, 500, 200, 800)
                val alertSound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)
                setSound(
                    alertSound,
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION_EVENT)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
            }

            // 2. WARNING Channel (High Importance)
            val warningChannel = NotificationChannel(
                CHANNEL_WARNING,
                getString(R.string.channel_warning_name),
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = getString(R.string.channel_warning_desc)
                enableVibration(true)
            }

            // 3. ADVISORY Channel (Default Importance)
            val advisoryChannel = NotificationChannel(
                CHANNEL_ADVISORY,
                getString(R.string.channel_advisory_name),
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = getString(R.string.channel_advisory_desc)
            }

            // 4. SYSTEM Channel (Low Importance)
            val systemChannel = NotificationChannel(
                CHANNEL_SYSTEM,
                getString(R.string.channel_system_name),
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = getString(R.string.channel_system_desc)
            }

            notificationManager.createNotificationChannels(
                listOf(emergencyChannel, warningChannel, advisoryChannel, systemChannel)
            )
        }
    }

    companion object {
        const val CHANNEL_EMERGENCY = "terraguardian_emergency_alerts"
        const val CHANNEL_WARNING = "terraguardian_hazard_warnings"
        const val CHANNEL_ADVISORY = "terraguardian_weather_advisories"
        const val CHANNEL_SYSTEM = "terraguardian_system_alerts"
    }
}
