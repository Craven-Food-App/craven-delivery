import React from 'react';
import {
  Card,
  Stack,
  Text,
  Title,
  List,
  Code,
  Divider,
  Table,
  Badge,
  Alert,
  Accordion,
} from '@mantine/core';
import { IconInfoCircle, IconCalculator, IconChartBar, IconSettings } from '@tabler/icons-react';

export const DriverCompensationDocumentation: React.FC = () => {
  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Driver Compensation Documentation</Title>
        <Text c="dimmed" size="sm" mt="xs">
          Complete guide to the Driver Compensation Engine and pay structure
        </Text>
      </div>

      <Alert icon={<IconInfoCircle size={16} />} color="blue" title="Overview">
        The Driver Compensation Engine calculates driver earnings based on delivery fees, distance,
        peak times, hotspots, and performance metrics. This system ensures fair and transparent
        compensation while maintaining profitability.
      </Alert>

      <Accordion defaultValue="overview">
        <Accordion.Item value="overview">
          <Accordion.Control icon={<IconInfoCircle size={20} />}>
            <Text fw={600}>System Overview</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Text>
                The Driver Compensation Engine is a comprehensive system that calculates driver
                earnings for each delivery trip. It takes into account multiple factors to ensure
                drivers are fairly compensated while maintaining company profitability.
              </Text>
              <List>
                <List.Item>
                  <Text fw={600}>Base Pay:</Text> Percentage of delivery fee (default 70%)
                </List.Item>
                <List.Item>
                  <Text fw={600}>Distance Bonus:</Text> Additional pay for longer distance deliveries
                </List.Item>
                <List.Item>
                  <Text fw={600}>Peak Time Multipliers:</Text> Increased pay during high-demand periods
                </List.Item>
                <List.Item>
                  <Text fw={600}>Hotspot Bonuses:</Text> Extra compensation for deliveries in designated zones
                </List.Item>
                <List.Item>
                  <Text fw={600}>Performance Bonuses:</Text> Rewards for high-performing drivers
                </List.Item>
                <List.Item>
                  <Text fw={600}>Penalties:</Text> Deductions for violations or poor performance
                </List.Item>
              </List>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="formulas">
          <Accordion.Control icon={<IconCalculator size={20} />}>
            <Text fw={600}>Earnings Calculation Formulas</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="lg">
              <Card withBorder padding="lg">
                <Title order={4} mb="md">
                  Trip Earnings Formula
                </Title>
                <Code block>
                  {`Total Earnings = Base Earnings 
  + Distance Bonus 
  + Peak Bonus 
  + Hotspot Bonus 
  + Performance Bonus 
  - Penalties

Where:
- Base Earnings = max(
    (Delivery Fee × Base Percentage / 100),
    Minimum per Delivery
  )
- Distance Bonus = Base Bonus + (Miles × Per Mile Bonus)
- Peak Bonus = Base Earnings × (Peak Multiplier - 1)
- Hotspot Bonus = Fixed amount if delivery in hotspot zone
- Performance Bonus = Base Earnings × (Performance % / 100) if score ≥ 95`}
                </Code>
              </Card>

              <Card withBorder padding="lg">
                <Title order={4} mb="md">
                  Weekly Stats Aggregation
                </Title>
                <Code block>
                  {`Weekly Stats:
- Total Earnings = Sum of all trip earnings
- Total Hours = Sum of active delivery time
- Avg Earnings/Hour = Total Earnings / Total Hours
- Avg Earnings/Trip = Total Earnings / Total Trips
- Net Earnings = Total Earnings + Bonuses - Penalties`}
                </Code>
              </Card>

              <Card withBorder padding="lg">
                <Title order={4} mb="md">
                  Driver Score Calculation
                </Title>
                <Code block>
                  {`Driver Score = (On-Time Rate × 0.4) 
  + (Completion Rate × 0.3) 
  + (Acceptance Rate × 0.3)

Score Range: 0-100
- 90-100: Premium Tier (Highest bonuses)
- 80-89: Standard Tier (Standard bonuses)
- 70-79: Restricted Tier (Limited bonuses)
- <70: Limited Tier (No bonuses)`}
                </Code>
              </Card>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="configuration">
          <Accordion.Control icon={<IconSettings size={20} />}>
            <Text fw={600}>Configuration Guide</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Title order={4}>Pay Configuration Settings</Title>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Setting</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Default</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td>
                      <Text fw={600}>Base Percentage</Text>
                    </Table.Td>
                    <Table.Td>
                      Percentage of delivery fee paid to drivers
                    </Table.Td>
                    <Table.Td>
                      <Badge>70%</Badge>
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Text fw={600}>Minimum per Delivery</Text>
                    </Table.Td>
                    <Table.Td>
                      Guaranteed minimum earnings per delivery
                    </Table.Td>
                    <Table.Td>
                      <Badge>$2.00</Badge>
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Text fw={600}>Distance Bonus Enabled</Text>
                    </Table.Td>
                    <Table.Td>
                      Toggle distance-based bonuses
                    </Table.Td>
                    <Table.Td>
                      <Badge color="gray">Disabled</Badge>
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Text fw={600}>Performance Bonus Enabled</Text>
                    </Table.Td>
                    <Table.Td>
                      Toggle performance-based bonuses
                    </Table.Td>
                    <Table.Td>
                      <Badge color="gray">Disabled</Badge>
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Text fw={600}>Instant Payout Fee</Text>
                    </Table.Td>
                    <Table.Td>
                      Fee charged for instant payouts
                    </Table.Td>
                    <Table.Td>
                      <Badge>$0.00</Badge>
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="peak-rules">
          <Accordion.Control icon={<IconChartBar size={20} />}>
            <Text fw={600}>Peak Rules Management</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Text>
                Peak rules allow you to increase driver compensation during high-demand periods.
                This helps ensure driver availability when customer demand is highest.
              </Text>
              <List>
                <List.Item>
                  <Text fw={600}>Time-Based Rules:</Text> Apply multipliers during specific time
                  ranges (e.g., 5:00 PM - 8:00 PM)
                </List.Item>
                <List.Item>
                  <Text fw={600}>Zone-Based Rules:</Text> Apply multipliers in specific delivery
                  zones (e.g., Downtown, West Side)
                </List.Item>
                <List.Item>
                  <Text fw={600}>Day-Based Rules:</Text> Apply multipliers on specific days of the
                  week (e.g., Friday, Saturday)
                </List.Item>
              </List>
              <Alert color="yellow" title="Best Practices">
                <List size="sm">
                  <List.Item>
                    Set peak multipliers between 1.2x and 2.0x for optimal driver incentive
                  </List.Item>
                  <List.Item>
                    Monitor profitability during peak times to ensure multipliers are sustainable
                  </List.Item>
                  <List.Item>
                    Review peak rule effectiveness weekly and adjust based on driver availability
                  </List.Item>
                </List>
              </Alert>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="bonuses">
          <Accordion.Control icon={<IconChartBar size={20} />}>
            <Text fw={600}>Bonus System</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Title order={4}>Types of Bonuses</Title>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Bonus Type</Table.Th>
                    <Table.Th>Description</Table.Th>
                    <Table.Th>Trigger</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="blue">Performance Bonus</Badge>
                    </Table.Td>
                    <Table.Td>
                      Additional percentage for high-performing drivers
                    </Table.Td>
                    <Table.Td>Driver score ≥ 95</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="green">Hotspot Bonus</Badge>
                    </Table.Td>
                    <Table.Td>
                      Fixed bonus for deliveries in hotspot zones
                    </Table.Td>
                    <Table.Td>Delivery in active hotspot zone</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="orange">Streak Bonus</Badge>
                    </Table.Td>
                    <Table.Td>
                      Bonus for consecutive days of activity
                    </Table.Td>
                    <Table.Td>7+ consecutive days</Table.Td>
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>
                      <Badge color="purple">Referral Bonus</Badge>
                    </Table.Td>
                    <Table.Td>
                      Bonus for referring new drivers
                    </Table.Td>
                    <Table.Td>Referred driver completes onboarding</Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="profitability">
          <Accordion.Control icon={<IconChartBar size={20} />}>
            <Text fw={600}>Profitability Metrics</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Text>
                Monitor these key metrics to ensure the compensation system remains profitable:
              </Text>
              <List>
                <List.Item>
                  <Text fw={600}>Driver Payout vs Revenue:</Text> Percentage of delivery fee
                  revenue paid to drivers (target: 60-75%)
                </List.Item>
                <List.Item>
                  <Text fw={600}>Profit per Delivery:</Text> Net profit after driver payouts
                  (target: $1.50+)
                </List.Item>
                <List.Item>
                  <Text fw={600}>Average Hourly Earnings:</Text> Driver earnings per hour (target:
                  $15-25/hour)
                </List.Item>
                <List.Item>
                  <Text fw={600}>Net Driver Margin:</Text> Total revenue minus total driver payouts
                  (target: positive margin)
                </List.Item>
              </List>
              <Alert color="green" title="Healthy Metrics">
                A healthy compensation system maintains driver satisfaction (high hourly earnings)
                while ensuring company profitability (positive margins). Regular review of these
                metrics helps balance both objectives.
              </Alert>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="troubleshooting">
          <Accordion.Control icon={<IconInfoCircle size={20} />}>
            <Text fw={600}>Troubleshooting</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="md">
              <Title order={4}>Common Issues</Title>
              <List>
                <List.Item>
                  <Text fw={600}>Driver earnings seem incorrect:</Text>
                  <Text size="sm" c="dimmed" mt="xs">
                    Check the compensation configuration, peak rules, and driver score. Use the
                    Diagnostics tool in the CTO Portal to recalculate earnings for specific trips.
                  </Text>
                </List.Item>
                <List.Item>
                  <Text fw={600}>Peak multipliers not applying:</Text>
                  <Text size="sm" c="dimmed" mt="xs">
                    Verify peak rules are active, time ranges are correct, and zones match delivery
                    locations.
                  </Text>
                </List.Item>
                <List.Item>
                  <Text fw={600}>Bonuses not showing:</Text>
                  <Text size="sm" c="dimmed" mt="xs">
                    Ensure bonus types are enabled in configuration and driver meets eligibility
                    criteria (score, hotspot, etc.).
                  </Text>
                </List.Item>
                <List.Item>
                  <Text fw={600}>Profitability concerns:</Text>
                  <Text size="sm" c="dimmed" mt="xs">
                    Review base percentage, peak multipliers, and bonus amounts. Consider adjusting
                    minimum per delivery or reducing peak multipliers if margins are negative.
                  </Text>
                </List.Item>
              </List>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Card withBorder padding="lg" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Stack gap="xs">
          <Title order={4} c="white">
            Need Help?
          </Title>
          <Text c="white" size="sm">
            For additional support or questions about the Driver Compensation system, contact the
            Finance Department or CTO.
          </Text>
        </Stack>
      </Card>
    </Stack>
  );
};



