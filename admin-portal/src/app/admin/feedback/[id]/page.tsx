import FeedbackDetailClient from "./FeedbackDetailClient";

export default function AdminFeedbackDetailPage({ params }: { params: { id: string } }) {
  return <FeedbackDetailClient reportId={params.id} />;
}
