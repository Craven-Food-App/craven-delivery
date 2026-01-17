// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, Progress, Tag, Row, Col, Statistic } from 'antd';
import { RocketOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { supabase } from '@/integrations/supabase/client';
import dayjs from 'dayjs';

interface Objective {
  id: string;
  title: string;
  description: string;
  objective_type: string;
  target_value: number;
  current_value: number;
  progress_percentage: number;
  status: string;
  priority: string;
  target_date: string;
}

export const StrategicOverview: React.FC = () => {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchObjectives();
  }, []);

  const fetchObjectives = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ceo_objectives')
        .select('*')
        .order('priority');

      if (error) throw error;
      setObjectives(data || []);
    } catch (error) {
      console.error('Error fetching objectives:', error);
    } finally {
      setLoading(false);
    }
  };

  const completedObjectives = objectives.filter(o => o.status === 'completed');
  const avgProgress = objectives.length > 0
    ? Math.round(objectives.reduce((sum, obj) => sum + (obj.progress_percentage || 0), 0) / objectives.length)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Strategic Overview</h2>
        <p className="text-slate-600">Company objectives and strategic initiatives</p>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Objectives"
              value={objectives.length}
              prefix={<RocketOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Completed"
              value={completedObjectives.length}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <div className="text-center">
              <Progress
                type="circle"
                percent={avgProgress}
                size={80}
                strokeColor={avgProgress > 70 ? '#52c41a' : avgProgress > 40 ? '#faad14' : '#ff4d4f'}
              />
              <div className="text-sm text-slate-600 mt-2">Average Progress</div>
            </div>
          </Card>
        </Col>
      </Row>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {objectives.map((objective) => (
          <Card key={objective.id} className="shadow-lg hover:shadow-xl transition-shadow">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">{objective.title}</h3>
                  <p className="text-sm text-slate-600">{objective.description}</p>
                </div>
                <Tag color={objective.priority === 'critical' ? 'red' : 'blue'}>
                  {objective.priority.toUpperCase()}
                </Tag>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>{objective.current_value?.toLocaleString() || 0} / {objective.target_value?.toLocaleString()}</span>
                  <span className="font-semibold">{objective.progress_percentage || 0}%</span>
                </div>
                <Progress
                  percent={objective.progress_percentage || 0}
                  showInfo={false}
                  strokeColor={
                    objective.progress_percentage >= 100 ? '#52c41a' :
                    objective.progress_percentage >= 70 ? '#1890ff' : '#faad14'
                  }
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <Tag color={objective.status === 'completed' ? 'green' : 'blue'}>
                  {objective.status.toUpperCase().replace('-', ' ')}
                </Tag>
                <span className="text-slate-500">
                  Due: {dayjs(objective.target_date).format('MMM D, YYYY')}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

