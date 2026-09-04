import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Video, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoRedirectItem {
  id: string;
  fractieledenIds?: string[];
}

export default function VideoRedirect() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Geen video ID opgegeven.");
      return;
    }

    fetch("/api/videos")
      .then((res) => (res.ok ? res.json() : []))
      .then((videos: VideoRedirectItem[]) => {
        const found = videos.find((v) => String(v.id) === String(id));
        if (found) {
          const memberId = found.fractieledenIds && found.fractieledenIds.length > 0
            ? found.fractieledenIds[0]
            : "1";
          // Redirect to the member video page with parameter and fragment
          navigate(`/fractie/${memberId}/videos?v=${id}#video-item-${id}`, { replace: true });
        } else {
          setError(`Video met ID "${id}" kon niet worden gevonden.`);
        }
      })
      .catch(() => {
        setError("Er is een fout opgetreden bij het laden van de videogegevens.");
      });
  }, [id, navigate]);

  if (error) {
    return (
      <div className="container py-24 text-center max-w-xl mx-auto">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="font-display text-3xl mb-3">Video niet gevonden</h1>
        <p className="text-muted-foreground text-sm mb-6">{error}</p>
        <Button asChild className="bg-primary hover:bg-primary/90 font-semibold">
          <Link to="/fractie">
            <ArrowLeft className="w-4 h-4 mr-2" /> Naar fractieleden & video's
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Video className="w-4 h-4 text-accent" />
        Video wordt geladen en doorgestuurd...
      </p>
    </div>
  );
}
