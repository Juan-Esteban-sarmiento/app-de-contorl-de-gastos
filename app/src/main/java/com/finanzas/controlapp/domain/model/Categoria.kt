package com.finanzas.controlapp.domain.model

/**
 * Tipo de categoría (Gasto o Ingreso).
 */
enum class TipoCategoria {
    GASTO,
    INGRESO
}

/**
 * Entidad de dominio que representa una categoría para clasificar transacciones.
 *
 * @property id Identificador único auto-generado.
 * @property nombre Nombre descriptivo de la categoría.
 * @property icono Nombre o identificador del ícono a mostrar (ej. nombre del Material Icon).
 * @property tipo Indica si es una categoría para gastos o ingresos.
 * @property esPersonalizada true si fue creada por el usuario, false si es predeterminada.
 */
data class Categoria(
    val id: Long = 0L,
    val nombre: String,
    val icono: String,
    val tipo: TipoCategoria,
    val esPersonalizada: Boolean = true
) {
    init {
        require(nombre.isNotBlank()) { "El nombre de la categoría no puede estar vacío" }
    }
}
