package com.finanzas.controlapp

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

/**
 * Clase base de la aplicación.
 * La anotación @HiltAndroidApp inicializa la inyección de dependencias generada por Hilt,
 * que servirá como contenedor a nivel de aplicación.
 */
@HiltAndroidApp
class FinanzasApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Aquí se puede inicializar analíticas, crashlytics, etc.
    }
}
