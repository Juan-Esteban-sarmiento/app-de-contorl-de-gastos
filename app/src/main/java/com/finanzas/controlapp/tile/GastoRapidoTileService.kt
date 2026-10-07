package com.finanzas.controlapp.tile

import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService

/**
 * Servicio de Quick Settings Tile (Atajo en el Centro de Control de Android)
 * que permite al usuario registrar un gasto rápidamente sin abrir la app.
 */
class GastoRapidoTileService : TileService() {

    override fun onStartListening() {
        super.onStartListening()
        // Actualiza el estado del Tile para que siempre esté activo (disponible)
        val tile = qsTile ?: return
        tile.state = Tile.STATE_ACTIVE
        tile.updateTile()
    }

    override fun onClick() {
        super.onClick()
        
        // Al hacer click, lanzamos la activity transparente que muestra el diálogo
        val intent = Intent(this, GastoRapidoActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            val pendingIntent = PendingIntent.getActivity(
                this, 
                0, 
                intent, 
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            startActivityAndCollapse(pendingIntent)
        } else {
            @Suppress("DEPRECATION")
            startActivityAndCollapse(intent)
        }
    }
}
