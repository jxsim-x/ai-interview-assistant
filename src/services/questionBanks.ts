export interface QuestionBank {
  [subject: string]: {
    easy: string[];
    medium: string[];
    hard: string[];
  };
}

export const questionBanks: QuestionBank = {
  'React Developer': {
    // Easy (20 seconds each): Quick recall, definitions
    easy: [
      'What is JSX in React?',
      'Name 3 React hooks you use regularly.',
      'What is the Virtual DOM?',
      'What is the difference between props and state?',
      'What is a React component?',
      'What does useState hook do?',
      'What is React used for?',
      'Name 2 advantages of using React.'
    ],
    
    // Medium (60 seconds each): Practical application
    medium: [
      'Explain how useEffect hook works with an example.',
      'How do you handle forms in React? Describe your approach.',
      'What is lifting state up? When would you use it?',
      'Explain the difference between controlled and uncontrolled components.',
      'How do you optimize performance in a React app?',
      'What is Context API and when would you use it instead of props?',
      'Describe how you would fetch data from an API in React.',
      'Explain React component lifecycle in functional components.'
    ],
    
    // Hard (120 seconds each): Design & problem-solving
    hard: [
      'Design a React architecture for a large e-commerce application. What folder structure and state management would you choose and why?',
      'How would you implement infinite scroll in React? Explain your approach including performance considerations.',
      'Compare Redux vs Context API vs Zustand. When would you use each? Provide a real-world scenario.',
      'You have a React app with poor performance. Walk me through your debugging and optimization strategy.',
      'Design a reusable form validation system in React. How would you handle complex validation rules?',
      'Explain how you would implement code-splitting and lazy loading in a large React application.'
    ]
  },
  
  'Node.js Developer': {
    easy: [
      'What is Node.js? Explain in one sentence.',
      'What is npm?',
      'Name 3 core modules in Node.js.',
      'What is an event loop?',
      'What is Express.js used for?'
    ],
    
    medium: [
      'Explain the difference between asynchronous and synchronous programming in Node.js.',
      'How do you handle errors in Node.js? Show an example.',
      'What is middleware in Express? Provide a use case.',
      'Explain how you would structure a Node.js REST API project.',
      'How do you read files in Node.js? Show your approach.'
    ],
    
    hard: [
      'Design a scalable Node.js microservices architecture for a food delivery app. How would services communicate?',
      'How would you handle authentication and authorization in a Node.js API? Explain JWT vs sessions.',
      'Explain your strategy for handling 10,000 concurrent connections in Node.js.',
      'Design a real-time chat application using Node.js. What technologies would you use and why?',
      'How would you implement rate limiting and caching in a high-traffic Node.js API?'
    ]
  },
  
  'Python Developer': {
    easy: [
      'What is Python used for?',
      'What is the difference between a list and a tuple?',
      'What does the self keyword mean in Python?',
      'Name 3 Python data types.',
      'What is a decorator in Python?'
    ],
    
    medium: [
      'Explain list comprehension with an example.',
      'How do you handle exceptions in Python? Show your approach.',
      'What is the difference between @staticmethod and @classmethod?',
      'Explain how Python manages memory.',
      'How would you read and parse a CSV file in Python?'
    ],
    
    hard: [
      'Design a Python web scraper that handles rate limiting, retries, and proxies. Explain your architecture.',
      'Compare Django vs FastAPI vs Flask. When would you use each framework?',
      'How would you optimize a slow Python script? Walk through your profiling and optimization process.',
      'Design a data pipeline in Python that processes 1 million records daily. What libraries and approach would you use?',
      'Explain how you would implement asynchronous programming in Python for I/O-bound tasks.'
    ]
  }
};
export const getQuestionBankSubjects = (): string[] => {
  return Object.keys(questionBanks).filter(subject => subject !== 'Custom Subject');
};

export const isCustomSubject = (subject: string): boolean => {
  return subject === 'Custom Subject' || !questionBanks[subject];
};
