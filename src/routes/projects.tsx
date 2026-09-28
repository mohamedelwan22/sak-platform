import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/PublicLayout";
import { SectionHeading, Spinner, EmptyState } from "@/components/shared/ui-kit";
import { projectsQuery, landsQuery } from "@/lib/queries";
import { LandCard } from "@/routes/index";
import { Landmark } from "lucide-react";
import { t } from "@/i18n";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: t("projects.k5") },
      {
        name: "description",
        content: t("projects.k6"),
      },
      { property: "og:title", content: t("projects.k7") },
      { property: "og:description", content: t("projects.k8") },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { data: projects, isLoading: pl } = useQuery(projectsQuery);
  const { data: lands, isLoading: ll } = useQuery(landsQuery);

  return (
    <PublicLayout>
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-8">
        <SectionHeading
          eyebrow={t("projects.k1")}
          title={t("projects.k2")}
          description={t("projects.k3")}
        />
        {pl || ll ? (
          <Spinner />
        ) : !projects?.length ? (
          <EmptyState icon={Landmark} title={t("projects.k4")} />
        ) : (
          <div className="space-y-14">
            {projects.map(
              (project: {
                id: string;
                title_ar: string;
                description_ar: string;
                city: string;
                country: string;
                expected_roi: number;
              }) => {
                const projectLands = (lands ?? []).filter(
                  (l: { project_id: string }) => l.project_id === project.id,
                );
                return (
                  <section key={project.id}>
                    <div className="mb-6 flex flex-wrap items-center gap-3">
                      <h2 className="text-xl font-bold text-foreground">{project.title_ar}</h2>
                      <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                        {project.city}
                        {t("projects.k10000")} {project.country}
                      </span>
                      <span className="num rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success">
                        {t("projects.k10001")} {Number(project.expected_roi)}%
                      </span>
                    </div>
                    <p className="mb-6 max-w-3xl text-sm text-muted-foreground">
                      {project.description_ar}
                    </p>
                    {projectLands.length ? (
                      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {projectLands.map(
                          (land: {
                            id: string;
                            title_ar: string;
                            country: string;
                            city: string;
                            asset_type: string;
                            expected_roi: number;
                            maturity_months: number;
                            total_sak_inventory: number;
                            available_sak: number;
                            status: string;
                            cover_image_url: string | null;
                          }) => (
                            <LandCard key={land.id} land={land} />
                          ),
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground/70">{t("projects.k10000")}</p>
                    )}
                  </section>
                );
              },
            )}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
