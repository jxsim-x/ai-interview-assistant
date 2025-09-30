import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Empty, Tag, Divider, Space } from 'antd';
import {
  BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { TrophyOutlined, UserOutlined, ClockCircleOutlined, StarOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const AnalyticsDashboard: React.FC = () => {
  // ✅ FIX #4: Get data from Redux
  const candidates = useSelector((state: RootState) => state.candidates.list);
  const sessions = useSelector((state: RootState) => state.interview.allSessions || []);
  
  // ✅ FIX #4: Force re-render when data changes
  const [dataVersion, setDataVersion] = useState(0);

  useEffect(() => {
    console.log('📊 [ANALYTICS] Data synced:', {
      candidates: candidates.length,
      sessions: sessions.length,
      version: dataVersion + 1
    });
    setDataVersion(prev => prev + 1);
  }, [candidates.length, sessions.length]);

  // ✅ FIX #4: Calculate from CANDIDATES (not sessions)
  const completedCandidates = candidates.filter(c => c.status === 'completed');
  const totalCandidates = candidates.length;
  const completedInterviews = completedCandidates.length;

  // ✅ FIX #4: Average score from candidates
  const averageScore = completedCandidates.length > 0 
    ? Math.round(
        completedCandidates.reduce((sum, c) => sum + c.totalScore, 0) / completedCandidates.length
      )
    : 0;

  // ✅ FIX #4: Score distribution from candidates
  const scoreRanges = [
    { range: '90-100', count: 0, color: '#52c41a' },
    { range: '80-89', count: 0, color: '#73d13d' },
    { range: '70-79', count: 0, color: '#fadb14' },
    { range: '60-69', count: 0, color: '#fa8c16' },
    { range: '0-59', count: 0, color: '#ff4d4f' }
  ];

  completedCandidates.forEach(candidate => {
    const score = candidate.totalScore;
    if (score >= 90) scoreRanges[0].count++;
    else if (score >= 80) scoreRanges[1].count++;
    else if (score >= 70) scoreRanges[2].count++;
    else if (score >= 60) scoreRanges[3].count++;
    else scoreRanges[4].count++;
  });

  // ✅ FIX #4: Subject performance from candidates + sessions
  const subjectPerformance: Record<string, { total: number; count: number; average: number }> = {};

  completedCandidates.forEach(candidate => {
    // Get subject from the candidate's interview session
    const session = sessions.find(s => s.candidateId === candidate.id);
    const subject = session?.subject || 'Unknown';
    
    if (!subjectPerformance[subject]) {
      subjectPerformance[subject] = { total: 0, count: 0, average: 0 };
    }
    
    subjectPerformance[subject].total += candidate.totalScore;
    subjectPerformance[subject].count++;
    subjectPerformance[subject].average = 
      subjectPerformance[subject].total / subjectPerformance[subject].count;
  });

  const subjectData = Object.entries(subjectPerformance).map(([subject, data]) => ({
    subject: subject.replace(' Developer', '').replace(' Scientist', ''),
    average: Math.round(data.average),
    count: data.count
  }));

  // Show empty state if no candidates
  if (totalCandidates === 0) {
    return (
      <Card>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Complete some interviews to see analytics data here."
        />
      </Card>
    );
  }

  return (
    <div>
      <Title level={2}>📊 Interview Analytics Dashboard</Title>

      {/* Summary Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Candidates"
              value={totalCandidates}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completed Interviews"
              value={completedInterviews}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Average Score"
              value={averageScore}
              suffix="%"
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completion Rate"
              value={totalCandidates > 0 ? Math.round((completedInterviews / totalCandidates) * 100) : 0}
              suffix="%"
              prefix={<StarOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {completedInterviews > 0 && (
        <>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            {/* Score Distribution */}
            <Col span={12}>
              <Card title="📈 Score Distribution">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={scoreRanges}
                      dataKey="count"
                      nameKey="range"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {scoreRanges.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            {/* Subject Performance */}
            <Col span={12}>
              <Card title="📚 Performance by Subject">
                {subjectData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={subjectData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="subject" />
                      <YAxis />
                      <Tooltip 
                        content={({ payload }) => {
                          if (payload && payload[0]) {
                            return (
                              <div style={{ background: 'white', padding: '10px', border: '1px solid #ccc', borderRadius: '4px' }}>
                                <p style={{ margin: 0 }}><strong>{payload[0].payload.subject}</strong></p>
                                <p style={{ margin: '4px 0 0 0' }}>Average: {payload[0].value}%</p>
                                <p style={{ margin: '4px 0 0 0', color: '#1890ff' }}>
                                  Candidates: {payload[0].payload.count}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend />
                      <Bar dataKey="average" fill="#1890ff" name="Average Score %" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Empty description="Complete more interviews to see subject performance" />
                )}
              </Card>
            </Col>
          </Row>

          {/* Recent Interview Summary */}
          <Card title="🕒 Recent Interviews">
            {completedCandidates.length > 0 ? (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {completedCandidates.slice(-5).reverse().map((candidate) => {
                  const session = sessions.find(s => s.candidateId === candidate.id);
                  return (
                    <div key={candidate.id} style={{ padding: '8px', background: '#fafafa', borderRadius: '4px' }}>
                      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                        <Text strong>{candidate.name}</Text>
                        <Space>
                          <Tag>{session?.subject || 'Unknown'}</Tag>
                          <Tag color={
                            candidate.totalScore >= 80 ? 'green' :
                            candidate.totalScore >= 60 ? 'orange' : 'red'
                          }>
                            {candidate.totalScore}%
                          </Tag>
                          <Text type="secondary">
                            {candidate.completedAt 
                              ? new Date(candidate.completedAt).toLocaleDateString() 
                              : 'N/A'
                            }
                          </Text>
                        </Space>
                      </Space>
                    </div>
                  );
                })}
              </Space>
            ) : (
              <Empty description="No completed interviews yet" />
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
