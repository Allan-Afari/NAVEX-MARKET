import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/hooks/useSession";
import Navbar from "@/components/landing/Navbar";
import DealRoomList from "@/components/deal-rooms/DealRoomList";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderOpen, Plus } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const DealRooms = () => {
  const { user, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-10 h-10 rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead title="Deal Rooms" description="Deal room collaboration spaces for investors and businesses" />
      <Navbar />
      <div className="container px-4 pt-24 pb-12">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FolderOpen className="w-7 h-7 text-primary" />
              Deal Rooms
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl mt-2">
              Centralized collaboration spaces with document access, participant permissions, and audit-ready workflows.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
            <Button size="sm" className="gradient-primary text-primary-foreground" onClick={() => navigate("/deal-room/create")}>Create Room</Button>
          </div>
        </div>

        <DealRoomList user={user} />
      </div>
    </div>
  );
};

export default DealRooms;
