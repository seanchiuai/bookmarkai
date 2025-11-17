import CollectionManager from "@/components/CollectionManager";
import TagManager from "@/components/TagManager";

export default function OrganizePage() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6 max-w-5xl mx-auto w-full">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-semibold mb-2 tracking-tight">Organize</h1>
          <p className="text-muted-foreground">
            Manage your collections and tags
          </p>
        </div>

        <div className="space-y-6">
          <div className="animate-fade-in animate-delay-100">
            <CollectionManager />
          </div>

          <div className="animate-fade-in animate-delay-200">
            <TagManager />
          </div>
        </div>
      </div>
    </div>
  );
}
