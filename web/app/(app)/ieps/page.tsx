import { redirect } from 'next/navigation';

// /ieps has no useful listing on its own — every IEP lives inside a child.
// Deep links (from printable-view opens, external emails, browser history)
// land here and get bounced to the children list where users can drill into
// the specific child's IEP tab.
export default function IepsIndexPage() {
  redirect('/children');
}
