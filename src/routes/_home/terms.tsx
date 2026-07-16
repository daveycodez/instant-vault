import { Link as HeroLink, Separator } from "@heroui/react"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_home/terms")({ component: TermsPage })

function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 md:py-16">
      <h1 className="font-mono text-3xl font-bold tracking-tight">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: July 14, 2026
      </p>

      <Separator className="my-8" />

      <div className="space-y-8">
        <section>
          <h2 className="font-mono text-xl font-semibold">
            1. Acceptance of Terms
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            By accessing or using InstantVault ("the Service"), you agree to be
            bound by these Terms of Service. If you do not agree to these terms,
            you may not access or use the Service. We reserve the right to
            update or modify these terms at any time without prior notice. Your
            continued use of the Service after any changes constitutes your
            acceptance of the new terms.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xl font-semibold">
            2. Description of Service
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            InstantVault provides automated backup and restore solutions for
            InstantDB databases. The Service allows users to create snapshots,
            schedule recurring backups, and restore data to any connected
            database instance.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xl font-semibold">3. User Accounts</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            You are responsible for maintaining the confidentiality of your
            account credentials and for all activities that occur under your
            account. You must notify us immediately of any unauthorized use of
            your account. We are not liable for any loss or damage arising from
            your failure to protect your account.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xl font-semibold">4. Acceptable Use</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            You agree not to use the Service for any unlawful purpose or in
            violation of any applicable laws. You may not interfere with or
            disrupt the Service, attempt to gain unauthorized access, or use the
            Service to store or transmit malicious code, spam, or illegal
            content.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xl font-semibold">
            5. Data Backups & Retention
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            While we take reasonable measures to ensure the reliability of our
            backup services, we do not guarantee that backups will be error-free
            or that restored data will be complete. You are responsible for
            verifying the integrity of your backups. Backup retention periods
            are determined by your subscription plan.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xl font-semibold">
            6. Intellectual Property
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            The Service and its original content, features, and functionality
            are owned by InstantVault and are protected by international
            copyright, trademark, and other intellectual property laws. You
            retain all rights to the data you store and back up through the
            Service.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xl font-semibold">
            7. Limitation of Liability
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            In no event shall InstantVault, its officers, directors, employees,
            or agents be liable for any indirect, incidental, special,
            consequential, or punitive damages arising out of your use of or
            inability to use the Service. Our total liability for any claim
            arising out of or relating to these terms shall not exceed the
            amount paid by you for the Service in the twelve months preceding
            the claim.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xl font-semibold">
            8. Disclaimer of Warranties
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            The Service is provided on an "AS IS" and "AS AVAILABLE" basis
            without warranties of any kind, either express or implied,
            including, but not limited to, implied warranties of
            merchantability, fitness for a particular purpose, or
            non-infringement.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xl font-semibold">9. Termination</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            We may terminate or suspend your account and access to the Service
            immediately, without prior notice or liability, for any reason,
            including if you breach these Terms. Upon termination, your right to
            use the Service will immediately cease. Provisions that by their
            nature should survive termination shall survive.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xl font-semibold">10. Governing Law</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            These Terms shall be governed and construed in accordance with the
            laws of the United States, without regard to its conflict of law
            provisions. Any disputes arising under these Terms shall be resolved
            exclusively in the courts of competent jurisdiction located in the
            United States.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xl font-semibold">11. Contact</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            If you have any questions about these Terms, please contact us at{" "}
            <HeroLink href="mailto:support@instantvault.dev" underline="offset">
              support@instantvault.dev
            </HeroLink>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
