import pool from "../db";

export interface SquadMember {
  id: number;
  squad_code: string;
  user_id: number;
  user_name: string;
  handle: string | null;
  avatar_url: string | null;
  lat: number | null;
  lng: number | null;
  speed: number;
  heading: number;
  last_ping: string;
}

export interface SquadDetails {
  id: number;
  code: string;
  name: string;
  leader_id: number;
  destination_lat: number | null;
  destination_lng: number | null;
  destination_name: string | null;
  created_at: string;
  members: SquadMember[];
}

function generateSquadCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new squad convoy room
 */
export async function createSquad(
  leaderId: number,
  leaderName: string,
  handle?: string | null,
  avatarUrl?: string | null,
  squadName?: string
): Promise<SquadDetails> {
  const code = generateSquadCode();
  const name = squadName?.trim() || `${leaderName}'s Squad`;

  await pool.query(
    `INSERT INTO squads (code, name, leader_id, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     RETURNING id`,
    [code, name, leaderId]
  );

  // Add leader as first member
  await pool.query(
    `INSERT INTO squad_members (squad_code, user_id, user_name, handle, avatar_url, last_ping)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (squad_code, user_id) DO UPDATE
     SET user_name = $3, handle = $4, avatar_url = $5, last_ping = NOW()`,
    [code, leaderId, leaderName, handle, avatarUrl]
  );

  return getSquadDetails(code) as Promise<SquadDetails>;
}

/**
 * Join an existing squad room by code
 */
export async function joinSquad(
  code: string,
  userId: number,
  userName: string,
  handle?: string | null,
  avatarUrl?: string | null
): Promise<SquadDetails | null> {
  const cleanCode = code.toUpperCase().trim();
  const squad = await pool.query(`SELECT id FROM squads WHERE code = $1`, [cleanCode]);
  if (squad.rowCount === 0) return null;

  await pool.query(
    `INSERT INTO squad_members (squad_code, user_id, user_name, handle, avatar_url, last_ping)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (squad_code, user_id) DO UPDATE
     SET user_name = $3, handle = $4, avatar_url = $5, last_ping = NOW()`,
    [cleanCode, userId, userName, handle, avatarUrl]
  );

  return getSquadDetails(cleanCode);
}

/**
 * Ping member location & speed
 */
export async function pingSquadLocation(
  code: string,
  userId: number,
  lat: number,
  lng: number,
  speed: number = 0,
  heading: number = 0
): Promise<void> {
  const cleanCode = code.toUpperCase().trim();
  await pool.query(
    `UPDATE squad_members
     SET lat = $1, lng = $2, speed = $3, heading = $4, last_ping = NOW()
     WHERE squad_code = $5 AND user_id = $6`,
    [lat, lng, speed, heading, cleanCode, userId]
  );
}

/**
 * Get squad details with active members (pinged within last 5 minutes)
 */
export async function getSquadDetails(code: string): Promise<SquadDetails | null> {
  const cleanCode = code.toUpperCase().trim();
  const squadRes = await pool.query(`SELECT * FROM squads WHERE code = $1`, [cleanCode]);
  if (squadRes.rowCount === 0) return null;

  const squad = squadRes.rows[0];

  const membersRes = await pool.query<SquadMember>(
    `SELECT * FROM squad_members
     WHERE squad_code = $1 AND last_ping >= NOW() - INTERVAL '5 minutes'
     ORDER BY last_ping DESC`,
    [cleanCode]
  );

  return {
    id: squad.id,
    code: squad.code,
    name: squad.name,
    leader_id: squad.leader_id,
    destination_lat: squad.destination_lat,
    destination_lng: squad.destination_lng,
    destination_name: squad.destination_name,
    created_at: squad.created_at,
    members: membersRes.rows,
  };
}

/**
 * Leave a squad
 */
export async function leaveSquad(code: string, userId: number): Promise<void> {
  const cleanCode = code.toUpperCase().trim();
  await pool.query(
    `DELETE FROM squad_members WHERE squad_code = $1 AND user_id = $2`,
    [cleanCode, userId]
  );
}
