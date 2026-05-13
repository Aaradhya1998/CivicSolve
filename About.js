import React from 'react';

const About = () => {
  return (
    <div className="about-container">
      <h1>About Civic Solve</h1>
      
      <section className="about-content">
        <h2>What We Offer to the Community</h2>
        
        <div className="about-description">
          <p>
            Civic Solve is dedicated to empowering communities by providing a platform 
            where citizens can voice their concerns and contribute to local problem-solving.
          </p>
          
          <h3>Our Mission</h3>
          <p>
            We believe in the power of community-driven solutions. Civic Solve gives the community:
          </p>
          
          <ul>
            <li>
              <strong>A Voice:</strong> A platform where citizens can report and discuss civic issues 
              affecting their neighborhoods and locality.
            </li>
            <li>
              <strong>Transparency:</strong> Direct access to information about community issues and 
              their resolution status.
            </li>
            <li>
              <strong>Collaboration:</strong> The ability to collaborate with neighbors and local authorities 
              to find solutions to civic problems.
            </li>
            <li>
              <strong>Accountability:</strong> Ensuring that civic issues are tracked and addressed 
              by responsible parties.
            </li>
            <li>
              <strong>Community Engagement:</strong> Building a stronger, more connected community 
              through active participation and engagement.
            </li>
            <li>
              <strong>Impact:</strong> Empowering citizens to create positive change in their communities 
              by turning complaints into actionable solutions.
            </li>
          </ul>
          
          <h3>Our Commitment</h3>
          <p>
            We are committed to making civic participation easy, transparent, and effective. 
            Together, we can build better, more responsive communities.
          </p>
        </div>
      </section>
    </div>
  );
};

export default About;