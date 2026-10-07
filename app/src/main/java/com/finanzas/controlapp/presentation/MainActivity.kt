package com.finanzas.controlapp.presentation

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.finanzas.controlapp.presentation.screen.dashboard.DashboardScreen
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme { // Usando tema base de Material 3 temporalmente
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    // Por ahora lanzamos directamente la pantalla del Dashboard
                    // En el Sprint 2 se implementará el NavHost con Compose Navigation
                    DashboardScreen(
                        onNavigateToNuevoGasto = { 
                            // TODO: Manejar navegación
                        }
                    )
                }
            }
        }
    }
}
