import AdminBar from "./_components/AdminBar";
import Sidebar from "./_components/Sidebar";
import AiPanel from "@/components/ai/AiPanel";
import SelectionToolbar from "@/components/ai/SelectionToolbar";

export default function WebsiteBuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#f0f0f1] text-[#1d2327]">
      <AdminBar />
      <div className="flex min-h-[calc(100vh-2rem)]">
        <Sidebar />
        <main className="flex-1 overflow-x-auto">{children}</main>
      </div>
      <SelectionToolbar />
      <AiPanel />
    </div>
  );
}
