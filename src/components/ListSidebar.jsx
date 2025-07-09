export default function ListSidebar({ lists, activeList, setActiveList, setLists }) {
  const addList = () => {
    const name = prompt('List name:');
    if (name) {
      const id = Date.now();
      setLists((prev) => [...prev, { id, name }]);
    }
  };

  return (
    <div className="w-80 bg-gray-100 pl-4 pr-8 py-4 space-y-2">
      <h2 className="font-bold text-lg">Your Lists</h2>
      {lists.map((list) => (
        <div
          key={list.id}
          onClick={() => setActiveList(list.id)}
          className={`p-2 cursor-pointer rounded ${
            activeList === list.id ? 'bg-blue-200' : 'hover:bg-gray-200'
          }`}
        >
          {list.name}
        </div>
      ))}
      <button
        onClick={addList}
        className="mt-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        + New List
      </button>
    </div>
  );
}