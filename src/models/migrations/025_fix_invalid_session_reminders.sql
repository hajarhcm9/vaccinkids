UPDATE notification AS n
SET message = 'Rappel: session prevue le ' ||
  TO_CHAR(s.date_session, 'YYYY-MM-DD') || ' a ' ||
  TO_CHAR(s.heure_debut, 'HH24:MI') || '.',
  updated_at = NOW()
FROM session AS s
WHERE n.reference_type = 'session'
  AND n.reference_id = s.id
  AND n.message LIKE '%Invalid Date%';
