import Link from "next/link";
import { Container, Shell, Card, Button, Badge } from "@/components/ui";

export default function HomePage() {
  return (
    <Shell>
      <Container>
        <div className="flex flex-col gap-6 py-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge>Drive-backed MVP</Badge>
            <Badge>QR join flow</Badge>
          </div>
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.35em] text-neutral-500">POV</p>
            <h1 className="mt-3 text-5xl font-semibold tracking-tight">A QR photo challenge app for weddings, parties, and events.</h1>
            <p className="mt-4 text-lg text-neutral-400">
              Create an event, generate a QR code, let guests upload candid photos, and store everything inside your Google Drive.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/admin"><Button>Create an Event</Button></Link>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              ["1", "Create event", "Set title, date, photo target, and prompts."],
              ["2", "Share QR", "Each event gets a join URL that you can turn into a QR code."],
              ["3", "Collect photos", "Guests upload photos that go directly into the event folder in Drive."],
            ].map(([step, title, body]) => (
              <Card key={step} className="p-6">
                <div className="text-sm text-neutral-500">Step {step}</div>
                <div className="mt-2 text-xl font-medium">{title}</div>
                <div className="mt-2 text-sm text-neutral-400">{body}</div>
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </Shell>
  );
}
