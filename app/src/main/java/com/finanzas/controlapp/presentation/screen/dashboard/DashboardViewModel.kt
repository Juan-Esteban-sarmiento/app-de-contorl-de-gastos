package com.finanzas.controlapp.presentation.screen.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.finanzas.controlapp.domain.model.Alerta
import com.finanzas.controlapp.domain.model.Deuda
import com.finanzas.controlapp.domain.model.EstadoDeuda
import com.finanzas.controlapp.domain.model.ResumenMensual
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.YearMonth
import java.time.format.DateTimeFormatter
import javax.inject.Inject

/**
 * Estado de la interfaz del Dashboard.
 */
data class DashboardUiState(
    val isLoading: Boolean = true,
    val resumen: ResumenMensual? = null,
    val alertasActivas: List<Alerta> = emptyList(),
    val deudasPendientes: List<Deuda> = emptyList(),
    val errorMensaje: String? = null
)

/**
 * ViewModel que orquesta los datos del Dashboard Principal.
 * Utiliza StateFlow para exponer estado inmutable a Compose.
 */
@HiltViewModel
class DashboardViewModel @Inject constructor(
    // En una app real, inyectaríamos UseCases:
    // private val obtenerResumenMensualUseCase: ObtenerResumenMensualUseCase,
    // private val evaluarAlertasUseCase: EvaluarAlertasPresupuestariasUseCase,
    // private val obtenerDeudasPendientesUseCase: ObtenerDeudasPendientesUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(DashboardUiState())
    val uiState: StateFlow<DashboardUiState> = _uiState.asStateFlow()

    init {
        cargarDatosDashboard()
    }

    private fun cargarDatosDashboard() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMensaje = null) }
            
            try {
                // Simulación de carga de datos desde casos de uso
                delay(800) // Simular latencia de DB local
                
                val mesAnioStr = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"))
                
                val mockResumen = ResumenMensual(
                    mesAnio = mesAnioStr,
                    totalIngresos = 5000.0,
                    totalGastos = 1450.50
                )
                
                // Mocks de alertas y deudas para UI
                _uiState.update { state ->
                    state.copy(
                        isLoading = false,
                        resumen = mockResumen,
                        alertasActivas = emptyList(), // Aquí vendrían del UseCase
                        deudasPendientes = emptyList() // Aquí vendrían del UseCase
                    )
                }
            } catch (e: Exception) {
                _uiState.update { 
                    it.copy(
                        isLoading = false, 
                        errorMensaje = "Error al cargar el dashboard: ${e.message}"
                    ) 
                }
            }
        }
    }
    
    fun refrescarDatos() {
        cargarDatosDashboard()
    }
}
