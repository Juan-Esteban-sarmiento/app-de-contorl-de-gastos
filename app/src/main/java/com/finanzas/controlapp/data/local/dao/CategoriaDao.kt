package com.finanzas.controlapp.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.finanzas.controlapp.data.local.entity.CategoriaEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface CategoriaDao {

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertAll(categorias: List<CategoriaEntity>)

    @Query("SELECT * FROM categorias WHERE tipo = :tipo ORDER BY nombre ASC")
    fun getByTipo(tipo: String): Flow<List<CategoriaEntity>>
    
    @Query("SELECT COUNT(id) FROM categorias")
    suspend fun getCount(): Int
}
