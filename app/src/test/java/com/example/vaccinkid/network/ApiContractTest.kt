package com.example.vaccinkid.network

import com.example.vaccinkid.model.CreateVaccinationRequest
import com.example.vaccinkid.model.SessionDto
import com.example.vaccinkid.model.StockMovementDto
import com.example.vaccinkid.model.UpdateStockRequest
import com.example.vaccinkid.model.UserDto
import com.google.gson.Gson
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Query

class ApiContractTest {
    private val gson = Gson()

    @Test
    fun snakeCaseServerPayloadDeserializesIntoCriticalDtos() {
        val user = gson.fromJson(
            """{"id":4,"role":"infirmier","centre_id":9}""",
            UserDto::class.java
        )
        val session = gson.fromJson(
            """{"id":7,"centre_id":9,"vaccin_id":3,"date_session":"2026-06-13","max_inscriptions":20}""",
            SessionDto::class.java
        )
        val movement = gson.fromJson(
            """{"id":2,"stock_id":5,"centre_id":9,"vaccin_id":3,"quantite_avant":8,"quantite_apres":7}""",
            StockMovementDto::class.java
        )

        assertEquals(9, user.centreId)
        assertEquals(3, session.vaccinId)
        assertEquals(20, session.maxInscriptions)
        assertEquals(8, movement.quantiteAvant)
        assertEquals(7, movement.quantiteApres)
    }

    @Test
    fun criticalMutationBodiesUseBackendFieldNames() {
        val vaccination = gson.toJson(CreateVaccinationRequest(3, 8.2, 70.0, null))
        val stock = gson.toJson(UpdateStockRequest(5, 2, "Correction inventaire"))

        assertTrue(vaccination.contains("\"flacon_id\":3"))
        assertTrue(stock.contains("\"quantite_disponible\":5"))
        assertTrue(stock.contains("\"seuil_alerte\":2"))
    }

    @Test
    fun criticalRetrofitPathsMatchBackendRoutes() {
        assertHttpPath("createVaccination", POST::class.java, "vaccinations/{rdvId}")
        assertHttpPath("callNext", PATCH::class.java, "file-attente/call-next")
        assertHttpPath("getStockMovements", GET::class.java, "stock/movements")
        assertHttpPath("reactivateAdminCentre", PATCH::class.java, "admin/centres/{id}/reactivate")
        assertHttpPath("getAdminAuditLog", GET::class.java, "admin/audit-log")
    }

    @Test
    fun adminAuditContractExposesRequiredFilters() {
        val method = ApiService::class.java.methods.single { it.name == "getAdminAuditLog" }
        val queryNames = method.parameterAnnotations.flatMap { annotations ->
            annotations.filterIsInstance<Query>().map { it.value }
        }

        assertTrue(queryNames.containsAll(listOf("page", "limit", "action", "table_name")))
        assertTrue(queryNames.containsAll(listOf("user_id", "date_debut", "date_fin")))
    }

    private fun <T : Annotation> assertHttpPath(
        methodName: String,
        annotationType: Class<T>,
        expectedPath: String
    ) {
        val method = ApiService::class.java.methods.single { it.name == methodName }
        val annotation = method.getAnnotation(annotationType)
        val path = when (annotation) {
            is GET -> annotation.value
            is POST -> annotation.value
            is PATCH -> annotation.value
            else -> null
        }
        assertEquals(expectedPath, path)
    }
}

