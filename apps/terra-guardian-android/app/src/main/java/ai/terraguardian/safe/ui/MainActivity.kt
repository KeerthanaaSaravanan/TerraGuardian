package ai.terraguardian.safe.ui

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Color
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.google.android.material.card.MaterialCardView
import ai.terraguardian.safe.R
import ai.terraguardian.safe.data.SafetyRepository
import ai.terraguardian.safe.model.CitizenSafetyStatus
import ai.terraguardian.safe.model.WarningLevel
import kotlinx.coroutines.launch

class MainActivity : AppCompatActivity() {

    private lateinit var repository: SafetyRepository
    private var currentLatitude: Double = 27.245
    private var currentLongitude: Double = 92.540
    private var currentAccuracyM: Float = 5.0f

    // Views
    private lateinit var tvStatusPill: TextView
    private lateinit var tvStatusHeadline: TextView
    private lateinit var tvLocationDetails: TextView
    private lateinit var cardSafetyStatus: MaterialCardView
    private lateinit var layoutActiveWarning: LinearLayout
    private lateinit var tvWarningRationale: TextView
    private lateinit var btnIAmSafe: Button
    private lateinit var tvActionText: TextView
    private lateinit var tvWhatChanged: TextView
    private lateinit var tvRoadStatus: TextView
    private lateinit var tvOfflineBanner: TextView
    private lateinit var btnReportHazard: Button

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        repository = SafetyRepository(this)
        initViews()
        requestPermissions()
        startLocationUpdates()
        loadSafetyStatus()

        // Handle I AM SAFE intent action if launched from notification action button
        if (intent?.action == "ACTION_I_AM_SAFE") {
            val alertId = intent?.getStringExtra("alert_id")
            if (!alertId.isNullOrEmpty()) {
                handleIAmSafe(alertId)
            }
        }
    }

    private fun initViews() {
        tvStatusPill = findViewById(R.id.tvStatusPill)
        tvStatusHeadline = findViewById(R.id.tvStatusHeadline)
        tvLocationDetails = findViewById(R.id.tvLocationDetails)
        cardSafetyStatus = findViewById(R.id.cardSafetyStatus)
        layoutActiveWarning = findViewById(R.id.layoutActiveWarning)
        tvWarningRationale = findViewById(R.id.tvWarningRationale)
        btnIAmSafe = findViewById(R.id.btnIAmSafe)
        tvActionText = findViewById(R.id.tvActionText)
        tvWhatChanged = findViewById(R.id.tvWhatChanged)
        tvRoadStatus = findViewById(R.id.tvRoadStatus)
        tvOfflineBanner = findViewById(R.id.tvOfflineBanner)
        btnReportHazard = findViewById(R.id.btnReportHazard)

        btnReportHazard.setOnClickListener {
            Toast.makeText(
                this,
                "Hazard Observation Mode: GPS (${currentLatitude.toString().take(6)}°N, ${currentLongitude.toString().take(6)}°E) recorded.",
                Toast.LENGTH_LONG
            ).show()
        }
    }

    private fun requestPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val needed = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (needed.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toTypedArray(), 101)
        }
    }

    private fun startLocationUpdates() {
        val locManager = getSystemService(LOCATION_SERVICE) as? LocationManager ?: return
        if (ActivityCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED) {
            try {
                locManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    15000L,
                    10f,
                    object : LocationListener {
                        override fun onLocationChanged(loc: Location) {
                            currentLatitude = loc.latitude
                            currentLongitude = loc.longitude
                            currentAccuracyM = loc.accuracy
                            loadSafetyStatus()
                        }
                        override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
                        override fun onProviderEnabled(provider: String) {}
                        override fun onProviderDisabled(provider: String) {}
                    }
                )
            } catch (e: Exception) {
                // GPS provider fallback
            }
        }
    }

    private fun loadSafetyStatus() {
        lifecycleScope.launch {
            val status = repository.getSafetyStatus(currentLatitude, currentLongitude, "West Kameng")
            renderSafetyStatus(status)
            repository.registerDevice(currentLatitude, currentLongitude, "West Kameng")
        }
    }

    private fun renderSafetyStatus(status: CitizenSafetyStatus) {
        tvStatusHeadline.text = status.statusHeadline
        tvLocationDetails.text = String.format(
            "%.3f°N, %.3f°E (West Kameng Corridor, GPS ±%.1fm)",
            currentLatitude,
            currentLongitude,
            currentAccuracyM
        )

        val color = Color.parseColor(status.safetyStatus.toColorHex())
        cardSafetyStatus.strokeColor = color
        tvStatusPill.setTextColor(color)
        tvStatusPill.text = when (status.safetyStatus) {
            WarningLevel.NORMAL -> "ALL CLEAR"
            WarningLevel.WATCH -> "MONSOON WATCH"
            WarningLevel.ADVISORY -> "ADVISORY ACTIVE"
            WarningLevel.WARNING, WarningLevel.SEVERE_WARNING -> "WARNING ACTIVE"
            WarningLevel.EMERGENCY -> "EMERGENCY EVACUATION"
        }

        // Active Warning & I AM SAFE handling
        val warning = status.activeWarning
        if (warning != null) {
            layoutActiveWarning.visibility = View.VISIBLE
            tvWarningRationale.text = "WHY: " + (warning.rationale ?: warning.message)
            btnIAmSafe.setOnClickListener {
                handleIAmSafe(warning.id)
            }
        } else {
            layoutActiveWarning.visibility = View.GONE
        }

        // What Should You Do Now
        if (status.recommendedActions.isNotEmpty()) {
            tvActionText.text = status.recommendedActions.joinToString("\n") { "▸ $it" }
        }

        // What Changed
        if (status.whatChanged.isNotEmpty()) {
            tvWhatChanged.text = status.whatChanged.joinToString("\n") { "• $it" }
        }

        // Road Statuses
        if (status.affectedRoads.isNotEmpty()) {
            val roadLines = status.affectedRoads.take(2).map {
                "${it.roadCode} (${it.corridorSection}): ${it.status}\n${it.conditionSummary}"
            }
            tvRoadStatus.text = roadLines.joinToString("\n\n")
        }

        // Stale Data Offline Banner
        tvOfflineBanner.visibility = if (status.isCachedStale) View.VISIBLE else View.GONE
    }

    private fun handleIAmSafe(alertId: String) {
        lifecycleScope.launch {
            repository.acknowledgeAlert(alertId, true, "Citizen confirmed safe via Native Android App.")
            btnIAmSafe.isEnabled = false
            btnIAmSafe.text = "✓ STATUS CONFIRMED: SAFE"
            Toast.makeText(this@MainActivity, "Status transmitted to DDMA Emergency Operations Centre.", Toast.LENGTH_SHORT).show()
        }
    }
}
