"use client"

import {
  Footer as FBFooter,
  FooterBrand,
  FooterCopyright,
  FooterDivider,
  FooterIcon,
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
    <FBFooter container className="footer">
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

        {/*<FooterDivider />*/}

        {/* SOCIAL MEDIA ICONS */}
        {/*<div className="w-full sm:flex sm:items-center sm:justify-between">*/}
        {/*  <FooterCopyright*/}
        {/*    href="/"*/}
        {/*    by="Glitch Glow™"*/}
        {/*    year={new Date().getFullYear()}*/}
        {/*  />*/}

        {/*  /!*<div className="mt-4 flex space-x-6 sm:mt-0 sm:justify-center">*!/*/}
        {/*  /!*  <FooterIcon href="#" icon={BsFacebook} />*!/*/}
        {/*  /!*  <FooterIcon href="#" icon={BsInstagram} />*!/*/}
        {/*  /!*  <FooterIcon href="#" icon={BsTwitter} />*!/*/}
        {/*  /!*  <FooterIcon href="#" icon={BsGithub} />*!/*/}
        {/*  /!*  <FooterIcon href="#" icon={BsDribbble} />*!/*/}
        {/*  /!*</div>*!/*/}
        {/*</div>*/}
      </div>
    </FBFooter>
  )
}
