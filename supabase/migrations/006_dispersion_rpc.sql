-- votes_dispersion: min/max/avg/stddev per factor for one initiative in one session
CREATE OR REPLACE FUNCTION votes_dispersion(p_session_id uuid, p_initiative_id uuid)
RETURNS TABLE (
  reach_min      numeric, reach_max      numeric, reach_avg      numeric, reach_stddev      numeric,
  impact_min     numeric, impact_max     numeric, impact_avg     numeric, impact_stddev     numeric,
  confidence_min numeric, confidence_max numeric, confidence_avg numeric, confidence_stddev numeric,
  effort_min     numeric, effort_max     numeric, effort_avg     numeric, effort_stddev     numeric,
  vote_count     bigint
)
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    ROUND(MIN(reach)::numeric,      1), ROUND(MAX(reach)::numeric,      1),
    ROUND(AVG(reach)::numeric,      1), ROUND(COALESCE(STDDEV(reach), 0)::numeric, 1),

    ROUND(MIN(impact)::numeric,     2), ROUND(MAX(impact)::numeric,     2),
    ROUND(AVG(impact)::numeric,     2), ROUND(COALESCE(STDDEV(impact), 0)::numeric, 2),

    ROUND(MIN(confidence)::numeric, 2), ROUND(MAX(confidence)::numeric, 2),
    ROUND(AVG(confidence)::numeric, 2), ROUND(COALESCE(STDDEV(confidence), 0)::numeric, 2),

    ROUND(MIN(effort)::numeric,     2), ROUND(MAX(effort)::numeric,     2),
    ROUND(AVG(effort)::numeric,     2), ROUND(COALESCE(STDDEV(effort), 0)::numeric, 2),

    COUNT(*)
  FROM votes
  WHERE session_id    = p_session_id
    AND initiative_id = p_initiative_id
$$;
