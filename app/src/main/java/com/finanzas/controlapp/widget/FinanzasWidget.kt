package com.finanzas.controlapp.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.Button
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalContext
import androidx.glance.action.actionStartActivity
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Alignment
import androidx.glance.layout.Column
import androidx.glance.layout.Row
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.fillMaxWidth
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import com.finanzas.controlapp.tile.GastoRapidoActivity

/**
 * App Widget construido con Jetpack Glance.
 * Muestra el balance actual y accesos directos.
 */
class FinanzasWidget : GlanceAppWidget() {

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // En una app real, aquí cargaríamos los datos reales desde la base de datos
        // mediante un UseCase o Repository antes de proveer el contenido.
        val balanceActual = 4549.50
        val gastosHoy = 150.00

        provideContent {
            GlanceTheme {
                WidgetContent(
                    balance = balanceActual, 
                    gastosHoy = gastosHoy
                )
            }
        }
    }

    @Composable
    private fun WidgetContent(balance: Double, gastosHoy: Double) {
        val context = LocalContext.current
        
        Column(
            modifier = GlanceModifier
                .fillMaxSize()
                .background(GlanceTheme.colors.surface)
                .padding(16.dp),
            horizontalAlignment = Alignment.Start
        ) {
            // Header
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "FinanzasApp",
                    style = TextStyle(
                        color = GlanceTheme.colors.onSurfaceVariant,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    ),
                    modifier = GlanceModifier.defaultWeight()
                )
            }
            
            Spacer(modifier = GlanceModifier.height(12.dp))
            
            // Balance Main
            Text(
                text = "Balance",
                style = TextStyle(
                    color = GlanceTheme.colors.onSurfaceVariant,
                    fontSize = 12.sp
                )
            )
            Text(
                text = "$${String.format("%.2f", balance)}",
                style = TextStyle(
                    color = GlanceTheme.colors.onSurface,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Bold
                ),
                // Al hacer click, abriríamos la MainActivity
                // modifier = GlanceModifier.clickable(actionStartActivity<MainActivity>())
            )
            
            Spacer(modifier = GlanceModifier.height(16.dp))
            
            // Info secundaria y botón de acción
            Row(
                modifier = GlanceModifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = GlanceModifier.defaultWeight()) {
                    Text(
                        text = "Gastos de hoy",
                        style = TextStyle(
                            color = GlanceTheme.colors.onSurfaceVariant,
                            fontSize = 12.sp
                        )
                    )
                    Text(
                        text = "$${String.format("%.2f", gastosHoy)}",
                        style = TextStyle(
                            color = GlanceTheme.colors.error,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Medium
                        )
                    )
                }
                
                // Botón + para agregar gasto rápido (lanza el overlay)
                Button(
                    text = "+ Gasto",
                    onClick = actionStartActivity<GastoRapidoActivity>(),
                    modifier = GlanceModifier.background(GlanceTheme.colors.primary)
                )
            }
        }
    }
}
