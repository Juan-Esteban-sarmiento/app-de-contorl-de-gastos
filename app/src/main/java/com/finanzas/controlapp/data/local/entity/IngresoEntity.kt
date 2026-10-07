package com.finanzas.controlapp.data.local.entity

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey
import java.time.LocalDate
import java.time.LocalDateTime

/**
 * Representación de la tabla de Ingresos en Room.
 */
@Entity(
    tableName = "ingresos",
    foreignKeys = [
        ForeignKey(
            entity = CategoriaEntity::class,
            parentColumns = ["id"],
            childColumns = ["categoriaId"],
            onDelete = ForeignKey.RESTRICT
        )
    ],
    indices = [Index(value = ["categoriaId"]), Index(value = ["fecha"])]
)
data class IngresoEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val monto: Double,
    val categoriaId: Long,
    val nota: String,
    val fecha: LocalDate,
    val creadoEn: LocalDateTime
)
