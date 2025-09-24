// app/routes/app.debug-db.jsx
import { json } from "@remix-run/node";
import prisma from "../db.server"; // adjust path to your prisma client

export const loader = async () => {
  try {
    const sessions = await prisma.session.findMany({
      take: 5, // only fetch a few
    });

    return json({
      ok: true,
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    return json({
      ok: false,
      error: error.message,
    });
  }
};
