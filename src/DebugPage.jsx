import MobilePushTest from './components/MobilePushTest';

export default function DebugPage() {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <MobilePushTest onClose={() => window.history.back()} />
    </div>
  );
}
