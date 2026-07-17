import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PublicLayout } from "@/components/PublicLayout";
import { SectionHeading, Spinner, EmptyState } from "@/components/shared/ui-kit";
import { projectsQuery, landsQuery } from "@/lib/queries";
import { LandCard } from "@/routes/index";
import { Landmark } from "lucide-react";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "المشاريع والأصول — SAK100" },
      {
        name: "description",
        content:
          "تصفح المشاريع الاستثمارية والأراضي والأصول المتاحة للاستثمار بوحدات SAK المرتبطة بالذهب.",
      },
      { property: "og:title", content: "المشاريع والأصول — SAK100" },
      { property: "og:description", content: "تصفح فرص الاستثمار في أصول حقيقية موثقة." },
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
          eyebrow="فرص الاستثمار"
          title="المشاريع والأصول"
          description="كل أصل موثق قانونياً ومقسم إلى وحدات SAK يمكنك امتلاكها."
        />
        {pl || ll ? (
          <Spinner />
        ) : !projects?.length ? (
          <EmptyState icon={Landmark} title="لا توجد مشاريع متاحة حالياً" />
        ) : (
          <div className="space-y-14">
            {projects.map((project) => {
              const projectLands = (lands ?? []).filter((l) => l.project_id === project.id);
              return (
                <section key={project.id}>
                  <div className="mb-6 flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold text-foreground">{project.title_ar}</h2>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
                      {project.city}، {project.country}
                    </span>
                    <span className="num rounded-full bg-success/15 px-3 py-1 text-xs font-bold text-success">
                      عائد متوقع {Number(project.expected_roi)}%
                    </span>
                  </div>
                  <p className="mb-6 max-w-3xl text-sm text-muted-foreground">
                    {project.description_ar}
                  </p>
                  {projectLands.length ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {projectLands.map((land) => (
                        <LandCard key={land.id} land={land} />
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground/70">
                      لا توجد أصول منشورة في هذا المشروع بعد.
                    </p>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}
