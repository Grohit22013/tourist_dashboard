package com.example.mraksha

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorManager
import android.os.Bundle
import android.telephony.PhoneStateListener
import android.telephony.SignalStrength
import android.telephony.TelephonyManager
import androidx.core.app.ActivityCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {

    private val SENSOR_CHANNEL = "sensor_channel"
    private val SIGNAL_CHANNEL = "signal_channel"

    private var signalLevel: Int = -1

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        // ---------------- SENSOR CHANNEL ----------------
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, SENSOR_CHANNEL)
            .setMethodCallHandler { call, result ->
                if (call.method == "getSensorList") {
                    val sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
                    val sensors = sensorManager.getSensorList(Sensor.TYPE_ALL)
                    val sensorNames = sensors.map { it.name }
                    result.success(sensorNames)
                } else {
                    result.notImplemented()
                }
            }

        // ---------------- SIGNAL CHANNEL ----------------
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, SIGNAL_CHANNEL)
            .setMethodCallHandler { call, result ->
                if (call.method == "getSignalStrength") {
                    result.success(signalLevel) // returns 0 to 4
                } else {
                    result.notImplemented()
                }
            }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        listenToSignalStrength()
    }

    // -------- LISTEN TO SIGNAL STRENGTH --------
    private fun listenToSignalStrength() {
        val telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as TelephonyManager

        if (ActivityCompat.checkSelfPermission(
                this,
                Manifest.permission.READ_PHONE_STATE
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.READ_PHONE_STATE),
                200
            )
            return
        }

        telephonyManager.listen(object : PhoneStateListener() {
            override fun onSignalStrengthsChanged(signal: SignalStrength?) {
                super.onSignalStrengthsChanged(signal)
                signal?.let {
                    signalLevel = it.level  // 0 to 4
                }
            }
        }, PhoneStateListener.LISTEN_SIGNAL_STRENGTHS)
    }
}
