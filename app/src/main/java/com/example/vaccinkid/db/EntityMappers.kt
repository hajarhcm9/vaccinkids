package com.example.vaccinkid.db

import com.example.vaccinkid.model.RendezVousDto
import com.example.vaccinkid.model.SessionDto

fun RendezVousEntity.toDto() = RendezVousDto(
    id = id,
    sessionId = sessionId,
    parentId = parentId,
    bebeId = bebeId,
    statut = statut,
    bebePrenom = bebePrenom,
    bebeNom = bebeNom,
    bebeDateNaissance = bebeDateNaissance,
    bebeSexe = bebeSexe,
    bebeCodeQr = bebeCodeQr,
    parentNom = parentNom,
    parentPrenom = parentPrenom,
    parentTelephone = parentTelephone,
    heureDebut = heureDebut,
    vaccinNom = vaccinNom,
    dateSession = dateSession,
    numeroQueue = numeroQueue
)

fun SessionEntity.toDto() = SessionDto(
    id = id,
    centreId = centreId,
    vaccinId = vaccinId,
    dateSession = dateSession,
    heureDebut = heureDebut,
    heureFin = heureFin,
    maxInscriptions = maxInscriptions,
    statut = statut,
    vaccinNom = vaccinNom
)

fun RendezVousDto.toEntity() = RendezVousEntity(
    id = id,
    sessionId = sessionId,
    parentId = parentId,
    bebeId = bebeId,
    statut = statut,
    bebePrenom = bebePrenom,
    bebeNom = bebeNom,
    bebeDateNaissance = bebeDateNaissance,
    bebeSexe = bebeSexe,
    bebeCodeQr = bebeCodeQr,
    parentNom = parentNom,
    parentPrenom = parentPrenom,
    parentTelephone = parentTelephone,
    heureDebut = heureDebut,
    vaccinNom = vaccinNom,
    dateSession = dateSession,
    numeroQueue = numeroQueue
)

fun SessionDto.toEntity() = SessionEntity(
    id = id,
    centreId = centreId,
    vaccinId = vaccinId,
    dateSession = dateSession,
    heureDebut = heureDebut,
    heureFin = heureFin,
    maxInscriptions = maxInscriptions,
    statut = statut,
    vaccinNom = vaccinNom
)
