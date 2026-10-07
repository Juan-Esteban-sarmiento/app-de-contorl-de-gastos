package com.finanzas.controlapp.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Representación de la tabla de Presupuestos en Room.
 */
@Entity(
    tableName = "presupuestos",
    foreignKeys = [
        ForeignKey(
            entity = CategoriaEntity::class,
            parentColumns = ["id"],
            childColumns = ["categoriaId"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    // Un presupuesto único por categoría y por mes
    indices = [Index(value = ["categoriaId", "mesAnio"], unique = true)]
)
data class PresupuestoEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val categoriaId: Long,
    val montoLimite: Double,
    val mesAnio: String // Formato YYYY-MM
)
