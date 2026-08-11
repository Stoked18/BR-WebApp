import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { aktuellerBenutzer } from '@/lib/auth';
import { darf, istArbeitgeberseite } from '@/lib/authz';

export const dynamic = 'force-dynamic';

/**
 * Einstiegsweiche. Jede Rolle landet dort, wo sie etwas sehen darf – sonst
 * bekaeme etwa der IT-Betrieb die Gremiumsuebersicht zu Gesicht.
 */
export default async function Start() {
  const benutzer = await aktuellerBenutzer();

  if (!benutzer) {
    // Frische Installation ohne jedes Konto: zur Ersteinrichtung.
    if ((await prisma.benutzer.count()) === 0) redirect('/einrichtung');
    redirect('/anmeldung');
  }

  // Ein von anderer Seite vergebenes Kennwort ist einer zweiten Person
  // bekannt. Bis es gewechselt ist, laesst sich keine Handlung sicher diesem
  // Konto zurechnen – deshalb fuehrt der Weg zuerst dorthin.
  if (benutzer.passwortWechsel) redirect('/konto');

  if (istArbeitgeberseite(benutzer)) redirect('/portal');
  if (darf(benutzer, 'gremium.lesen')) redirect('/uebersicht');
  if (darf(benutzer, 'datenschutz.lesen')) redirect('/datenschutz');
  if (darf(benutzer, 'audit.lesen')) redirect('/protokoll');
  redirect('/system');
}
