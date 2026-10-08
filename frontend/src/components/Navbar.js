import React from "react";
import "./Navbar.css"
import { Link } from "react-router-dom";

function Navbar ({ isAuthenticated }) {
    return(

        <div className="navbar">
           <div className="logo">Home Affiars System</div>
            <nav className="nav">
                <ul className="nav-links">
                    {isAuthenticated && (
                        <>
                    <li className="nav-item">
                        <Link to="/home-dashboard" className="">Home Dashboard</Link>    
                    </li>
                    <li className="nav-item">
                        <Link to="/home-affairs-dashboard" className="">Home Affairs Dashboard</Link>
                        </li>
                    <li className="nav-item">
                        <Link to="/passport-office-dashboard" className="">Passport Office Dashboard</Link>
                        </li>
                    <li className="nav-item">
                        <Link to="/police-dashboard" className="">Police Dashboard</Link>
                        </li>
                    <li className="nav-item">
                        <Link to="/finance-dashboard" className="">Finance Dashboard</Link>
                        </li>
                    <li className="nav-item">
                        <Link to="/pensions-dashboard" className="">Pension Dashboard</Link>
                        </li>
                    <li className="nav-item">
                        <Link to="/traffic-dashboard" className="">Traffic Dashboard</Link>
                        </li>
                        </>
                    )}
                    {!isAuthenticated && (
                        <>
                    <li className="nav-item">
                        <Link to="/login" className="">Login</Link>
                        </li>
                    <li className="nav-item">
                        <Link to="/register" className="">Register</Link>
                    </li>
                        </>
                    )}
                </ul>
            </nav>

        </div>
        //this is a comment
    )
}
export default Navbar;