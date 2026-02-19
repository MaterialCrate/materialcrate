import Acheivement from "../components/me/Acheivement";
import Header from "../components/me/Header";

export default function MePage() {
  return (
    <div className="space-y-4">
      <Header />
      <div className="px-6 flex justify-between">
        <Acheivement />
        <Acheivement />
      </div>
    </div>
  );
}
