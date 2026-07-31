import { redirect } from 'next/navigation';
import { aktuellerBenutzer } from '@/lib/auth';
import { darf, istArbeitgeberseite } from '@/lib/authz';

/**
 * Einstiegsweiche. Jede Rolle landet dort, wo sie etwas sehen darf – sonst
 * bekaeme etwa der IT-Betrieb die Gremiumsuebersicht zu Gesicht.
 */
export default async function Start() {
  const benutzer = await aktuellerBenutzer();
  if (!benutzer) redirect('/anmeldung');
  if (istArbeitgeberseite(benutzer)) redirect('/portal');
  if (darf(benutzer, 'gremium.lesen')) redirect('/uebersicht');
  if (darf(benutzer, 'datenschutz.lesen')) redirect('/datenschutz');
  if (darf(benutzer, 'audit.lesen')) redirect('/protokoll');
  redirect('/system');
}
