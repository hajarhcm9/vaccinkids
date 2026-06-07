package com.example.vaccinkid.network

import com.example.vaccinkid.model.*
import retrofit2.http.*

interface ApiService {
    @POST("auth/personnel/login")
    suspend fun personnelLogin(@Body request: LoginRequest): ApiResponse<AuthResponse>

    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: RefreshRequest): ApiResponse<AuthResponse>

    @POST("auth/logout")
    suspend fun logout(@Body body: Map<String, String?>): ApiResponse<Any>

    @GET("auth/me")
    suspend fun getMe(): ApiResponse<UserEnvelopeDto>

    @GET("statistiques/dashboard")
    suspend fun getDashboardStats(): ApiResponse<DashboardStatsDto>

    @GET("statistiques/top-vaccins")
    suspend fun getTopVaccins(@Query("centre_id") centreId: Int? = null): ApiResponse<List<Map<String, Any?>>>

    @GET("stats/dashboard")
    suspend fun getStatsDashboard(@Query("centreId") centreId: Int? = null): ApiResponse<Map<String, Any?>>

    @GET("stats/rendez-vous")
    suspend fun getStatsRendezVous(@Query("centreId") centreId: Int? = null): ApiResponse<Map<String, Any?>>

    @GET("stats/stock")
    suspend fun getStatsStock(@Query("centreId") centreId: Int? = null): ApiResponse<Map<String, Any?>>

    @GET("stats/absenteisme")
    suspend fun getStatsAbsenteisme(@Query("centreId") centreId: Int? = null): ApiResponse<Map<String, Any?>>

    @GET("sessions/today")
    suspend fun getTodaySessions(): ApiResponse<List<SessionDto>>

    @GET("sessions")
    suspend fun getSessions(@Query("centre_id") centreId: Int? = null): ApiResponse<List<SessionDto>>

    @POST("sessions")
    suspend fun createSession(@Body request: SessionRequest): ApiResponse<SessionDto>

    @PATCH("sessions/{id}")
    suspend fun updateSession(@Path("id") id: Int, @Body request: SessionRequest): ApiResponse<SessionDto>

    @PATCH("sessions/{id}/start")
    suspend fun startSession(@Path("id") id: Int): ApiResponse<SessionDto>

    @PATCH("sessions/{id}/end")
    suspend fun endSession(@Path("id") id: Int): ApiResponse<SessionDto>

    @PATCH("sessions/{id}/confirm")
    suspend fun confirmSession(@Path("id") id: Int): ApiResponse<SessionDto>

    @PATCH("sessions/{id}/cancel")
    suspend fun cancelSession(@Path("id") id: Int): ApiResponse<SessionDto>

    @GET("stock/centre/{centreId}")
    suspend fun getStock(@Path("centreId") centreId: Int): ApiResponse<List<StockDto>>

    @PATCH("stock/{id}")
    suspend fun updateStock(@Path("id") id: Int, @Body request: UpdateStockRequest): ApiResponse<StockDto>

    @POST("stock")
    suspend fun upsertStock(@Body request: UpsertStockRequest): ApiResponse<StockDto>

    @GET("stock/movements")
    suspend fun getStockMovements(
        @Query("centre_id") centreId: Int? = null,
        @Query("stock_id") stockId: Int? = null
    ): ApiResponse<List<StockMovementDto>>

    @GET("admin/personnel")
    suspend fun getAdminPersonnel(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100,
        @Query("search") search: String? = null
    ): ApiResponse<AdminPersonnelListDto>

    @POST("admin/personnel")
    suspend fun createAdminPersonnel(@Body request: AdminPersonnelRequest): ApiResponse<AdminPersonnelEnvelopeDto>

    @PATCH("admin/personnel/{id}")
    suspend fun updateAdminPersonnel(
        @Path("id") id: Int,
        @Body request: AdminPersonnelRequest
    ): ApiResponse<AdminPersonnelEnvelopeDto>

    @PATCH("admin/personnel/{id}/deactivate")
    suspend fun deactivateAdminPersonnel(@Path("id") id: Int): ApiResponse<Map<String, Any?>>

    @PATCH("admin/personnel/{id}/reactivate")
    suspend fun reactivateAdminPersonnel(@Path("id") id: Int): ApiResponse<Map<String, Any?>>

    @GET("admin/centres")
    suspend fun getAdminCentres(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 100,
        @Query("search") search: String? = null
    ): ApiResponse<AdminCentreListDto>

    @POST("admin/centres")
    suspend fun createAdminCentre(@Body request: AdminCentreRequest): ApiResponse<AdminCentreEnvelopeDto>

    @PATCH("admin/centres/{id}")
    suspend fun updateAdminCentre(
        @Path("id") id: Int,
        @Body request: AdminCentreRequest
    ): ApiResponse<AdminCentreEnvelopeDto>

    @PATCH("admin/centres/{id}/deactivate")
    suspend fun deactivateAdminCentre(@Path("id") id: Int): ApiResponse<Map<String, Any?>>

    @GET("admin/audit-log")
    suspend fun getAdminAuditLog(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50,
        @Query("action") action: String? = null,
        @Query("table_name") tableName: String? = null
    ): ApiResponse<AdminAuditLogListDto>

    @GET("vaccins")
    suspend fun getVaccins(@Query("all") all: Boolean = true): ApiResponse<List<VaccinDto>>

    @POST("vaccins")
    suspend fun createVaccin(@Body request: VaccinRequest): ApiResponse<VaccinDto>

    @PATCH("vaccins/{id}")
    suspend fun updateVaccin(@Path("id") id: Int, @Body request: VaccinRequest): ApiResponse<VaccinDto>

    @DELETE("vaccins/{id}")
    suspend fun deactivateVaccin(@Path("id") id: Int): ApiResponse<VaccinDto>

    @POST("flacons")
    suspend fun createFlacon(@Body request: CreateFlaconRequest): ApiResponse<FlaconDto>

    @GET("flacons/session/{sessionId}")
    suspend fun getSessionFlacons(@Path("sessionId") sessionId: Int): ApiResponse<List<FlaconDto>>

    @PATCH("flacons/{id}/waste")
    suspend fun recordWaste(@Path("id") id: Int): ApiResponse<FlaconDto>

    @PATCH("flacons/{id}/close")
    suspend fun closeFlacon(@Path("id") id: Int): ApiResponse<FlaconDto>

    @POST("vaccinations/{rdvId}")
    suspend fun createVaccination(
        @Path("rdvId") rdvId: Int,
        @Body request: CreateVaccinationRequest
    ): ApiResponse<VaccinationDto>

    @GET("vaccinations/session/{sessionId}")
    suspend fun getSessionVaccinations(@Path("sessionId") sessionId: Int): ApiResponse<List<VaccinationDto>>

    @GET("rendez-vous")
    suspend fun getRendezVous(
        @Query("statut") statut: String? = null,
        @Query("session_id") sessionId: Int? = null
    ): ApiResponse<List<RendezVousDto>>

    @GET("rendez-vous/session/{sessionId}")
    suspend fun getSessionRendezVous(@Path("sessionId") sessionId: Int): ApiResponse<List<RendezVousDto>>

    @PATCH("rendez-vous/{id}")
    suspend fun updateRendezVous(
        @Path("id") id: Int,
        @Body request: UpdateRendezVousRequest
    ): ApiResponse<RendezVousDto>

    @GET("carnet/qr/{code}")
    suspend fun getBebeByQr(@Path("code") code: String): ApiResponse<QrCarnetDto>

    @GET("carnet/bebe/{id}/croissance")
    suspend fun getCroissance(@Path("id") bebeId: Int): ApiResponse<List<CroissanceDto>>

    @GET("file-attente/centre/{centreId}")
    suspend fun getCentreQueue(@Path("centreId") centreId: Int): ApiResponse<QueueListDto>

    @GET("file-attente/stats")
    suspend fun getQueueStats(@Query("centre_id") centreId: Int? = null): ApiResponse<QueueStatsDto>

    @PATCH("file-attente/call-next")
    suspend fun callNext(@Body body: Map<String, Int>): ApiResponse<QueueEntryDto>

    @PATCH("file-attente/{id}/complete")
    suspend fun completeService(@Path("id") id: Int): ApiResponse<QueueEntryDto>

    @GET("notifications/me")
    suspend fun getNotifications(): ApiResponse<List<NotificationDto>>

    @GET("notifications/unread-count")
    suspend fun getUnreadCount(): ApiResponse<NotificationCountDto>

    @PATCH("notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: Int): ApiResponse<NotificationDto>

    @PATCH("notifications/read-all")
    suspend fun markAllNotificationsRead(): ApiResponse<Any>

    @GET("sync/status")
    suspend fun getSyncStatus(): ApiResponse<SyncStatusDto>

    @GET("sync/pull")
    suspend fun pullChanges(@Query("since") since: String? = null): ApiResponse<SyncPullDto>

    @POST("sync/push")
    suspend fun pushChanges(@Body request: SyncPushRequest): ApiResponse<List<SyncPushResultDto>>
}
