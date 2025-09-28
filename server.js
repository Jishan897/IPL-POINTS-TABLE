// ============ DATA STRUCTURES ============

class TeamNode {
  constructor(teamData) {
    this.name = teamData.name;
    this.shortName = teamData.shortName || teamData.name.split(' ').map(w => w[0]).join('').toUpperCase();
    this.captain = teamData.captain || '';
    this.homeGround = teamData.homeGround || '';
    this.color = teamData.color || '#000000';
    this.points = teamData.points || 0;
    this.netRunRate = teamData.netRunRate || 0;
    this.matchesPlayed = teamData.matchesPlayed || 0;
    this.wins = teamData.wins || 0;
    this.losses = teamData.losses || 0;
    this.noResults = teamData.noResults || 0;
    this.runsScored = teamData.runsScored || 0;
    this.runsConceded = teamData.runsConceded || 0;
    this.form = teamData.form || [];
    this.next = null;
  }
}

class LinkedList {
  constructor() {
    this.head = null;
  }

  addTeam(teamData) {
    const newNode = new TeamNode(teamData);
    if (!this.head) {
      this.head = newNode;
    } else {
      let temp = this.head;
      while (temp.next) {
        temp = temp.next;
      }
      temp.next = newNode;
    }
    return { team: newNode };
  }

  findTeam(name) {
    let temp = this.head;
    while (temp) {
      if (temp.name.toLowerCase() === name.toLowerCase()) {
        return temp;
      }
      temp = temp.next;
    }
    return null;
  }

  getAllTeams() {
    const teams = [];
    let temp = this.head;
    while (temp) {
      teams.push(temp);
      temp = temp.next;
    }
    return teams;
  }

  getStandings() {
    return this.getAllTeams().sort((a, b) => b.points - a.points || b.netRunRate - a.netRunRate);
  }

  getRanking(name) {
    const standings = this.getStandings();
    const index = standings.findIndex(t => t.name.toLowerCase() === name.toLowerCase());
    return index + 1;
  }
}

class Stack {
  constructor() {
    this.items = [];
  }

  push(item) {
    this.items.push(item);
  }

  pop() {
    return this.items.pop();
  }

  peek() {
    return this.items[this.items.length - 1];
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }

  getAll() {
    return [...this.items].reverse(); // Most recent first
  }
}

class Queue {
  constructor() {
    this.items = [];
  }

  enqueue(item) {
    this.items.push(item);
  }

  dequeue() {
    return this.items.shift();
  }

  front() {
    return this.items[0];
  }

  isEmpty() {
    return this.items.length === 0;
  }

  size() {
    return this.items.length;
  }

  getAll() {
    return this.items;
  }
}

class IPLTournament {
  constructor() {
    this.teams = new LinkedList();
    this.matchHistory = new Stack();
    this.upcomingMatches = new Queue();
  }

  addTeam(teamData) {
    return this.teams.addTeam(teamData);
  }

  getTeamStats(name) {
    return this.teams.findTeam(name);
  }

  getStandings() {
    return this.teams.getStandings();
  }

  getTournamentStats() {
    return {
      totalTeams: this.teams.getAllTeams().length,
      matchesPlayed: this.matchHistory.size(),
      playoffTeams: this.getPlayoffTeams().map(t => t.name),
    };
  }

  recordMatch({ team1, team2, team1Score, team2Score }) {
    const t1 = this.getTeamStats(team1);
    const t2 = this.getTeamStats(team2);

    if (!t1 || !t2) {
      throw new Error('Team not found');
    }

    t1.matchesPlayed++;
    t2.matchesPlayed++;

    // Update runs
    t1.runsScored += team1Score;
    t2.runsScored += team2Score;
    t1.runsConceded += team2Score;
    t2.runsConceded += team1Score;

    let result = {};
    let winner = '';

    // Automatically determine winner based on scores
    if (team1Score > team2Score) {
      t1.wins++;
      t2.losses++;
      t1.points += 2;
      result.winner = team1;
      winner = team1;
      t1.form.unshift('W');
      t2.form.unshift('L');
    } else if (team2Score > team1Score) {
      t2.wins++;
      t1.losses++;
      t2.points += 2;
      result.winner = team2;
      winner = team2;
      t2.form.unshift('W');
      t1.form.unshift('L');
    } else {
      // Tie
      t1.noResults++;
      t2.noResults++;
      t1.points += 1;
      t2.points += 1;
      result.tie = true;
      winner = 'Tie';
      t1.form.unshift('T');
      t2.form.unshift('T');
    }

    // Update NRR
    t1.netRunRate = t1.matchesPlayed > 0 ? parseFloat(((t1.runsScored - t1.runsConceded) / t1.matchesPlayed).toFixed(2)) : 0;
    t2.netRunRate = t2.matchesPlayed > 0 ? parseFloat(((t2.runsScored - t2.runsConceded) / t2.matchesPlayed).toFixed(2)) : 0;

    // Limit form history to last 5 matches
    t1.form = t1.form.slice(0, 5);
    t2.form = t2.form.slice(0, 5);

    const match = {
      team1,
      team2,
      team1Score,
      team2Score,
      winner,
      result,
      date: new Date()
    };

    this.matchHistory.push(match);
    return match;
  }

  getMatchHistory(limit = 50) {
    return this.matchHistory.getAll().slice(0, limit);
  }

  getPlayoffTeams() {
    return this.getStandings().slice(0, 4);
  }

  addUpcomingMatch(matchData) {
    this.upcomingMatches.enqueue(matchData);
  }

  getUpcomingMatches() {
    return this.upcomingMatches.getAll();
  }

  resetTournament() {
    this.teams = new LinkedList();
    this.matchHistory = new Stack();
    this.upcomingMatches = new Queue();
  }
}

// ============ EXPRESS SERVER ============

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Create tournament instance
const tournament = new IPLTournament();

// Initialize IPL teams
function initializeIPLTeams() {
  const teams = [
    { name: 'Mumbai Indians', shortName: 'MI', captain: 'Hardik Pandya', homeGround: 'Wankhede Stadium', color: '#004B9B' },
    { name: 'Chennai Super Kings', shortName: 'CSK', captain: 'MS Dhoni', homeGround: 'M.A. Chidambaram Stadium', color: '#F9CD05' },
    { name: 'Royal Challengers Bangalore', shortName: 'RCB', captain: 'Faf du Plessis', homeGround: 'M. Chinnaswamy Stadium', color: '#EC1C24' },
    { name: 'Kolkata Knight Riders', shortName: 'KKR', captain: 'Shreyas Iyer', homeGround: 'Eden Gardens', color: '#3A225D' },
    { name: 'Delhi Capitals', shortName: 'DC', captain: 'Rishabh Pant', homeGround: 'Arun Jaitley Stadium', color: '#17479E' },
    { name: 'Punjab Kings', shortName: 'PBKS', captain: 'Shikhar Dhawan', homeGround: 'IS Bindra Stadium', color: '#DD1F2D' },
    { name: 'Rajasthan Royals', shortName: 'RR', captain: 'Sanju Samson', homeGround: 'Sawai Mansingh Stadium', color: '#E01A85' },
    { name: 'Sunrisers Hyderabad', shortName: 'SRH', captain: 'Pat Cummins', homeGround: 'Rajiv Gandhi Intl Stadium', color: '#FF822A' },
    { name: 'Gujarat Titans', shortName: 'GT', captain: 'Shubman Gill', homeGround: 'Narendra Modi Stadium', color: '#1B2133' },
    { name: 'Lucknow Super Giants', shortName: 'LSG', captain: 'KL Rahul', homeGround: 'Ekana Cricket Stadium', color: '#1FB8EA' }
  ];
  teams.forEach(team => tournament.addTeam(team));
}

// ============ API ROUTES ============

// Get standings (uses LinkedList)
app.get('/api/standings', (req, res) => {
  const standings = tournament.getStandings();
  res.json({ success: true, data: standings });
});

// Get teams (uses LinkedList)
app.get('/api/teams', (req, res) => {
  const teams = tournament.teams.getAllTeams();
  res.json({ success: true, data: teams });
});

// Record match (uses LinkedList, Stack)
app.post('/api/matches', (req, res) => {
  const { team1, team2, team1Score, team2Score } = req.body;
  
  if (!team1 || !team2) {
    return res.status(400).json({ success: false, message: 'Both teams are required' });
  }
  
  const score1 = parseInt(team1Score) || 0;
  const score2 = parseInt(team2Score) || 0;
  
  if (score1 === 0 && score2 === 0) {
    return res.status(400).json({ success: false, message: 'Please enter scores for both teams' });
  }
  
  try {
    const match = tournament.recordMatch({
      team1,
      team2,
      team1Score: score1,
      team2Score: score2
    });
    
    res.json({ success: true, data: match, message: `Match recorded - ${match.winner} won!` });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get match history (uses Stack)
app.get('/api/matches/history', (req, res) => {
  const history = tournament.getMatchHistory();
  res.json({ success: true, data: history });
});

// Add team (uses LinkedList)
app.post('/api/teams', (req, res) => {
  const teamData = req.body;
  const teamName = teamData.name?.trim();
  
  if (!teamName) {
    return res.status(400).json({ success: false, message: 'Team name is required' });
  }
  
  if (tournament.getTeamStats(teamName)) {
    return res.status(409).json({ success: false, message: 'Team already exists' });
  }
  
  const team = tournament.addTeam(teamData);
  res.status(201).json({ success: true, data: team.team, message: 'Team added successfully' });
});

// Get tournament stats
app.get('/api/tournament', (req, res) => {
  const stats = tournament.getTournamentStats();
  const standings = tournament.getStandings();
  const playoffTeams = tournament.getPlayoffTeams();
  res.json({ 
    success: true, 
    data: { 
      tournament: stats, 
      standings, 
      playoffTeams 
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  const stats = tournament.getTournamentStats();
  res.json({ 
    success: true, 
    message: 'API running with data structures', 
    tournament: stats,
    dataStructures: {
      linkedList: 'Teams storage',
      stack: 'Match history',
      queue: 'Upcoming matches'
    }
  });
});

// Initialize teams and start server
initializeIPLTeams();

app.listen(PORT, () => {
  console.log('🚀 Server running on port 3000 with LinkedList, Stack, and Queue!');
});