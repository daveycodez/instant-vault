import { Link as HeroLink, Separator } from "@heroui/react"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/_home/privacy")({
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12 md:py-16">
      <h1 className="font-mono text-3xl font-bold tracking-tight">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: July 14, 2026
      </p>

      <Separator className="my-8" />

      <div className="prose prose-neutral max-w-none space-y-8">
        <section>
          <h2 className="font-mono text-xl font-semibold">1. Overview</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            instantVault ("we", "our", or "us") is committed to protecting your
            privacy. This Privacy Policy explains how we collect, use, disclose,
            and safeguard your information when you use our backup and restore
            service ("the Service"). By using the Service, you agree to the
            collection and use of information in accordance with this policy.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xl font-semibold">
            2. Information We Collect
          </h2>
          <h3 className="mt-4 font-semibold">2.1 Account Information</h3>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            When you create an account, we collect your email address and
            authentication credentials. We use magic link authentication and do
            not store passwords.
          </p>
          <h3 className="mt-4 font-semibold">2.2 Backup Data</h3>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            We store the database snapshots you create through the Service. This
            data is stored securely and is only accessible through your
            authenticated account.
          </p>
          <h3 className="mt-4 font-semibold">2.3 Usage Data</h3>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            We may collect information about how the Service is accessed and
            used, including page views, feature usage, and diagnostic data to
            help us improve the Service.
          </p>
          <h3 className="mt-4 font-semibold">2.4 Cookies</h3>
          <p className="mt-1 leading-relaxed text-muted-foreground">
            We use essential cookies to maintain your session and authentication
            state. We do not use tracking cookies or third-party analytics
            cookies.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xl font-semibold">
            3. How We Use Your Information
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            We use the collected information for the following purposes:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
            <li>To provide, maintain, and improve the Service</li>
            <li>To authenticate your identity and secure your account</li>
            <li>To perform backup and restore operations you request</li>
            <li>To communicate with you about your account and the Service</li>
            <li>To detect, prevent, and address technical issues or abuse</li>
            <li>To comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="font-mono text-xl font-semibold">
            4. Data Storage & Security
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Your backup data is stored on secure servers with encryption at rest
            and in transit. We implement industry-standard security measures
            including TLS encryption for all data transfers and encrypted
            storage for all backups. Access to backup data is strictly
            controlled and requires authentication through your account.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xl font-semibold">
            5. Data Sharing & Disclosure
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            We do not sell, trade, or rent your personal information or backup
            data to third parties. We may disclose your information only in the
            following circumstances:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
            <li>With your explicit consent</li>
            <li>To comply with a legal obligation or valid legal request</li>
            <li>To protect and defend our rights or property</li>
            <li>
              To prevent or investigate possible wrongdoing in connection with
              the Service
            </li>
          </ul>
        </section>

        <section>
          <h2 className="font-mono text-xl font-semibold">6. Data Retention</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            We retain your backup data for as long as your account is active and
            as needed to provide you the Service. You may delete your backups at
            any time through the Service. Upon account deletion, all associated
            data including backups will be permanently removed from our systems
            within 30 days.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xl font-semibold">7. Your Rights</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Depending on your jurisdiction, you may have the following rights
            regarding your personal data:
          </p>
          <ul className="mt-3 list-disc space-y-2 pl-6 text-muted-foreground">
            <li>The right to access your personal data</li>
            <li>The right to rectify inaccurate data</li>
            <li>The right to request deletion of your data</li>
            <li>The right to restrict or object to processing</li>
            <li>The right to data portability</li>
            <li>The right to withdraw consent at any time</li>
          </ul>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            To exercise any of these rights, please contact us at the email
            address provided below.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xl font-semibold">
            8. Third-Party Services
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            The Service integrates with InstantDB for database operations. We
            are not responsible for the privacy practices of third-party
            services. We encourage you to review the privacy policies of any
            third-party services you connect to through our platform.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xl font-semibold">
            9. Children's Privacy
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            The Service is not intended for use by individuals under the age of
            13. We do not knowingly collect personal information from children
            under 13. If we become aware that a child under 13 has provided us
            with personal information, we will take steps to delete such
            information.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xl font-semibold">
            10. Changes to This Policy
          </h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            We may update this Privacy Policy from time to time. We will notify
            you of any changes by posting the new Privacy Policy on this page
            and updating the "Last updated" date. You are advised to review this
            Privacy Policy periodically for any changes.
          </p>
        </section>

        <section>
          <h2 className="font-mono text-xl font-semibold">11. Contact Us</h2>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            If you have any questions about this Privacy Policy or our data
            practices, please contact us at{" "}
            <HeroLink href="mailto:privacy@instantvault.dev" underline="offset">
              privacy@instantvault.dev
            </HeroLink>
            .
          </p>
        </section>
      </div>
    </main>
  )
}
