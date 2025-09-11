import { useState } from 'react';

const Timeline = ({ items = [] }) => {
  const [selectedItem, setSelectedItem] = useState(null);

  const defaultItems = [
    { 
      id: 1,
      date: "2024", 
      title: "The Great Awakening", 
      status: "fulfilled", 
      side: "left",
      description: "A spiritual awakening sweeping across nations, bringing people back to divine truth and purpose.",
      evidence: ["Global prayer movements", "Increased church attendance", "Spiritual revival reports"],
      submittedBy: "Prophet John",
      submittedDate: "2023-01-15"
    },
    { 
      id: 2,
      date: "2025", 
      title: "Economic Transformation", 
      status: "pending", 
      side: "right",
      description: "A complete restructuring of global economic systems based on divine principles of justice and equity.",
      evidence: [],
      submittedBy: "Seer Maria",
      submittedDate: "2023-06-20"
    },
    { 
      id: 3,
      date: "2026", 
      title: "Spiritual Revival", 
      status: "pending", 
      side: "left",
      description: "Unprecedented spiritual revival touching every corner of the earth, with signs and wonders following.",
      evidence: [],
      submittedBy: "Visionary David",
      submittedDate: "2023-09-10"
    },
    { 
      id: 4,
      date: "2027", 
      title: "Unity of Nations", 
      status: "pending", 
      side: "right",
      description: "Nations coming together in unprecedented unity, setting aside differences for the common good.",
      evidence: [],
      submittedBy: "Prophet Sarah",
      submittedDate: "2024-01-05"
    }
  ];

  const timelineItems = items.length > 0 ? items : defaultItems;

  return (
    <div className="relative">
      {/* Timeline Line */}
      <div className="absolute left-1/2 transform -translate-x-1/2 w-1 h-full bg-gradient-to-b from-[#d4a574] to-[#f4d03f]"></div>

      {/* Timeline Items */}
      <div className="space-y-12">
        {timelineItems.map((item, index) => (
          <div key={item.id || index} className={`flex items-center ${item.side === 'right' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-1/2 ${item.side === 'right' ? 'pl-8' : 'pr-8'}`}>
              <div 
                className={`prophecy-card ${item.side === 'right' ? 'ml-auto' : ''} max-w-md cursor-pointer hover:scale-105 transition-transform duration-300`}
                onClick={() => setSelectedItem(item)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-[#d4a574]">{item.date}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    item.status === 'fulfilled' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {item.status === 'fulfilled' ? '✓ Fulfilled' : '⏳ Pending'}
                  </span>
                </div>
                <h4 className="font-display text-lg font-semibold text-[#1e3a5f] mb-2">{item.title}</h4>
                <p className="text-sm text-[#2c5f6f] mb-3">
                  {item.description || "A divine revelation submitted by the community, tracked and verified through our timeline system."}
                </p>
                {item.submittedBy && (
                  <div className="text-xs text-[#8b6f47] border-t pt-2">
                    Submitted by {item.submittedBy} • {item.submittedDate}
                  </div>
                )}
              </div>
            </div>
            
            {/* Timeline Node */}
            <div className="relative z-10">
              <div className={`w-4 h-4 rounded-full ${
                item.status === 'fulfilled' 
                  ? 'bg-green-400' 
                  : 'bg-yellow-400'
              } border-4 border-[#faf6f0] cursor-pointer hover:scale-125 transition-transform duration-300`}
              onClick={() => setSelectedItem(item)}></div>
            </div>
            
            <div className="w-1/2"></div>
          </div>
        ))}
      </div>

      {/* Modal for detailed view */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#faf6f0] rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-display text-2xl font-bold text-[#1e3a5f] mb-2">{selectedItem.title}</h3>
                  <div className="flex items-center gap-4">
                    <span className="text-[#d4a574] font-semibold">{selectedItem.date}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      selectedItem.status === 'fulfilled' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {selectedItem.status === 'fulfilled' ? '✓ Fulfilled' : '⏳ Pending'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="text-[#2c5f6f] hover:text-[#1e3a5f] text-2xl font-bold"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-[#1e3a5f] mb-2">Description</h4>
                  <p className="text-[#2c5f6f]">{selectedItem.description}</p>
                </div>
                
                {selectedItem.evidence && selectedItem.evidence.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-[#1e3a5f] mb-2">Evidence</h4>
                    <ul className="list-disc list-inside text-[#2c5f6f] space-y-1">
                      {selectedItem.evidence.map((evidence, idx) => (
                        <li key={idx}>{evidence}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="border-t pt-4">
                  <p className="text-sm text-[#8b6f47]">
                    Submitted by <span className="font-semibold">{selectedItem.submittedBy}</span> on {selectedItem.submittedDate}
                  </p>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button className="prophecy-button flex-1">
                    Submit Evidence
                  </button>
                  <button className="bg-transparent border-2 border-[#1e3a5f] text-[#1e3a5f] px-6 py-3 rounded-full font-semibold hover:bg-[#1e3a5f] hover:text-[#faf6f0] transition-all duration-300">
                    Vote
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timeline;
