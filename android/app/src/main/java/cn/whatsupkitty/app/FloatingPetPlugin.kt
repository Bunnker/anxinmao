package cn.whatsupkitty.app

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.activity.result.ActivityResult
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "FloatingPet")
class FloatingPetPlugin : Plugin() {

    @PluginMethod
    fun isSupported(call: PluginCall) {
        val ret = JSObject()
        ret.put("supported", Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
        call.resolve(ret)
    }

    @PluginMethod
    fun requestPermission(call: PluginCall) {
        if (Settings.canDrawOverlays(context)) {
            val ret = JSObject(); ret.put("granted", true); call.resolve(ret); return
        }
        val intent = Intent(
            Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:" + context.packageName),
        )
        startActivityForResult(call, intent, "overlayPermResult")
    }

    @ActivityCallback
    private fun overlayPermResult(call: PluginCall, result: ActivityResult) {
        val ret = JSObject()
        ret.put("granted", Settings.canDrawOverlays(context))
        call.resolve(ret)
    }

    @PluginMethod
    fun show(call: PluginCall) {
        if (!Settings.canDrawOverlays(context)) {
            call.reject("NO_OVERLAY_PERMISSION"); return
        }
        val i = Intent(context, FloatingPetService::class.java).apply { action = FloatingPetService.ACTION_SHOW }
        ContextCompat.startForegroundService(context, i)
        call.resolve()
    }

    @PluginMethod
    fun hide(call: PluginCall) {
        val i = Intent(context, FloatingPetService::class.java).apply { action = FloatingPetService.ACTION_HIDE }
        context.startService(i)
        call.resolve()
    }

    @PluginMethod
    fun isShown(call: PluginCall) {
        val ret = JSObject(); ret.put("shown", FloatingPetService.isRunning); call.resolve(ret)
    }

    @PluginMethod
    fun setRiskFlag(call: PluginCall) {
        val level = call.getString("level") ?: run { call.reject("level required"); return }
        val ts = (call.getDouble("ts") ?: System.currentTimeMillis().toDouble()).toLong()
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString("risk_level", level).putLong("risk_ts", ts).apply()
        call.resolve()
    }

    @PluginMethod
    fun clearRiskFlag(call: PluginCall) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .remove("risk_level").remove("risk_ts").apply()
        call.resolve()
    }

    companion object {
        const val PREFS = "floating_pet"
    }
}
