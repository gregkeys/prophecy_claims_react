import { LineChart, Line, XAxis, YAxis } from 'recharts';

export default function Viz() {
  const placeholderData = [
    { date: '2025-01', claims: 10 },
    { date: '2025-02', claims: 15 },
    { date: '2025-03', claims: 20 },
  ];
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl">Prophecy Claims Timeline</h1>
      <LineChart width={600} height={300} data={placeholderData}>
        <XAxis dataKey="date" />
        <YAxis />
        <Line type="monotone" dataKey="claims" stroke="#8884d8" />
      </LineChart>
    </div>
  );
}

