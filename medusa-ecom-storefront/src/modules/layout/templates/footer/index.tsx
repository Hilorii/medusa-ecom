"use client"

import {
  Footer as FBFooter,
  FooterBrand,
  FooterLink,
  FooterLinkGroup,
  FooterTitle,
} from "flowbite-react"

import {
  BsDribbble,
  BsFacebook,
  BsGithub,
  BsInstagram,
  BsTwitter,
} from "react-icons/bs"

import "./footer.css"

export default function Footer() {
  return (
    <FBFooter container className="footer" role="contentinfo">
      <div className="w-full">
        <div className="grid w-full justify-between sm:flex sm:justify-between md:flex md:grid-cols-1">
          <div>
            <FooterBrand
              href="/"
              src="/favicon.ico"
              alt="Glitch Glow Logo"
              name="Glitch Glow"
              className="gap-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-8 sm:mt-0 sm:grid-cols-2 sm:gap-12">
            <div>
              <FooterTitle title="Company" />
              <FooterLinkGroup col>
                <FooterLink href="/about">About Us</FooterLink>
                <FooterLink href="/shipping-returns">
                  Shipping &amp; Returns
                </FooterLink>
              </FooterLinkGroup>
            </div>

            <div>
              <FooterTitle title="Legal" />
              <FooterLinkGroup col>
                <FooterLink href="/terms">Terms &amp; Conditions</FooterLink>
                <FooterLink href="/privacy">Privacy Policy</FooterLink>
              </FooterLinkGroup>
            </div>
          </div>
        </div>

        {/* Social icons */}
        {/* <div className="mt-6 flex gap-4">
          <a aria-label="Facebook" href="#"><BsFacebook /></a>
          <a aria-label="Instagram" href="#"><BsInstagram /></a>
          <a aria-label="Twitter / X" href="#"><BsTwitter /></a>
          <a aria-label="GitHub" href="#"><BsGithub /></a>
          <a aria-label="Dribbble" href="#"><BsDribbble /></a>
        </div> */}
      </div>
    </FBFooter>
  )
}
