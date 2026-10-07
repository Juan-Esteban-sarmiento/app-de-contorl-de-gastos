package com.finanzas.controlapp.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Representación de la tabla de Categorías en Room.
 */
@Entity(tableName = "categorias")
data class CategoriaEntity(
    @PrimaryKey(autoGenerate = true)
    val id: Long = 0,
    val nombre: String,
    val icono: String,
    val tipo: String, // "GASTO" o "INGRESO"
    val esPersonalizada: Boolean
)
