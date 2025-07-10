import { listsService } from '../services/supabaseService';

export default function ListSidebar({ lists, activeList, setActiveList, setLists, onListsChange }) {
  const addList = async () => {
    const name = prompt('List name:');
    if (name) {
      try {
        console.log('Attempting to create list:', name);
        const newList = await listsService.createList(name);
        console.log('List created successfully:', newList);
        setLists((prev) => [...prev, newList]);
        setActiveList(newList.id); // Set the new list as active
      } catch (error) {
        console.error('Full error object:', error);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
        
        // If it's a Supabase error, it might have additional details
        if (error.details) console.error('Error details:', error.details);
        if (error.hint) console.error('Error hint:', error.hint);
        if (error.code) console.error('Error code:', error.code);
        
        alert(`Failed to create list: ${error.message || 'Unknown error'}`);
      }
    }
  };

  const deleteList = async (id) => {
    if (!confirm('Are you sure you want to delete this list and all its tasks?')) {
      return;
    }
    
    try {
      await listsService.deleteList(id);
      setLists((prev) => prev.filter((list) => list.id !== id));
      
      // If we deleted the active list, switch to the first remaining list
      if (activeList === id) {
        const remainingLists = lists.filter((list) => list.id !== id);
        setActiveList(remainingLists.length > 0 ? remainingLists[0].id : null);
      }
    } catch (error) {
      console.error('Error deleting list:', error);
      alert('Failed to delete list. Please try again.');
    }
  };

  return (
    <div className="w-80 bg-gray-100 space-y-2" style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '16px', paddingBottom: '16px' }}>
      <h2 className="font-bold text-lg mb-4">Your Lists</h2>
      {lists.map((list) => {
        const isActive = activeList === list.id;
        return (
        <div key={list.id} className="flex items-center justify-between group">
          <div
            onClick={() => setActiveList(list.id)}
            className="p-2 cursor-pointer rounded flex-1 hover:bg-gray-200"
            style={isActive ? {
              backgroundColor: '#3b82f6',
              color: 'white',
              fontWeight: '600'
            } : {}}
          >
            {list.name}
          </div>
          <button
            onClick={() => deleteList(list.id)}
            className="ml-2 text-red-500 opacity-0 group-hover:opacity-100"
            title="Delete list"
          >
            &times;
          </button>
        </div>
        );
      })}
      <button
        onClick={addList}
        className="mt-4 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        + New List
      </button>
    </div>
  );
}