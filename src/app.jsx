import { useState } from 'react';
import ListSidebar from './components/ListSidebar';
import TaskList from './components/TaskList';

export default function App() {
  const [lists, setLists] = useState([
    { id: 1, name: 'Personal' },
    { id: 2, name: 'Work' }
  ]);

  const [tasks, setTasks] = useState({
    1: [{ id: 1, text: 'Buy groceries', completed: false }],
    2: []
  });

  const [activeList, setActiveList] = useState(1);

  return (
    <div className="flex h-screen justify-center w-full">
      <div className="flex max-w-4xl mt-12 items-stretch">
        <div className="flex flex-col flex-1">
          <ListSidebar
            lists={lists}
            activeList={activeList}
            setActiveList={setActiveList}
            setLists={setLists}
          />
        </div>
        <div style={{ background: 'black', width: '4px', alignSelf: 'stretch', margin: '0 24px' }} />
        <div className="flex flex-col flex-1">
          <TaskList
            tasks={tasks[activeList] || []}
            setTasks={(updatedTasks) =>
              setTasks((prev) => ({ ...prev, [activeList]: updatedTasks }))
            }
          />
        </div>
      </div>
    </div>
  );
}