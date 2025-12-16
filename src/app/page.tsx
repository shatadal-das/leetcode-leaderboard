import Leaderboard from "@/components/leaderboard";

function Home() {
  return (
    <div className="mx-4">
      <div className="max-w-200 mx-auto py-4">
        <h1 className="my-8 md:text-2xl text-xl text-center font-bold text-neutral-100 tracking-wide">
          Leetcode Eliteboard
        </h1>
        <Leaderboard />
      </div>
    </div>
  );
}
export default Home;
